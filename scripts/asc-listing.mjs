// Pushes the App Store listing in store/ to App Store Connect: for every
// storefront in store/metadata/<locale>/, the name and subtitle, the
// description, keywords, promotional text and release notes of the version in
// app.json (created in App Store Connect if it doesn't exist yet), and the
// screenshots in screenshots/<locale>/. Nothing is submitted for review.
//
//   bun run asc:listing                      # metadata + screenshots, all storefronts
//   bun run asc:listing --dry-run            # show what would change
//   bun run asc:listing --locales "ja ko"    # only these storefronts
//   bun run asc:listing --no-screenshots     # metadata only
//   bun run asc:listing --replace-screenshots  # re-upload sets that already have screenshots
//
// Authenticates with the App Store Connect API key in ~/.private_keys
// (matchimals-asc.env naming ASC_KEY_ID and ASC_ISSUER_ID, beside
// AuthKey_<id>.p8); the key never leaves this machine.
import { createHash, createPrivateKey, sign } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const API = "https://api.appstoreconnect.apple.com/v1";
const BUNDLE_ID = "native.matchimals.fun";
// The display classes scripts/screenshots.sh captures, by output folder
const DISPLAYS = {
  "iphone-6.5": "APP_IPHONE_65",
  "ipad-13": "APP_IPAD_PRO_3GEN_129",
};

// --- Options ------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = flag("--dry-run");
const withScreenshots = !flag("--no-screenshots");
const replaceScreenshots = flag("--replace-screenshots");
const onlyLocales = option("--locales")?.split(/\s+/).filter(Boolean);

const log = (message) => console.log(message);
const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

// --- Authentication ---------------------------------------------------------

const keysDir = path.join(os.homedir(), ".private_keys");
const env = Object.fromEntries(
  (
    await readFile(path.join(keysDir, "matchimals-asc.env"), "utf8").catch(() =>
      fail(
        "No ~/.private_keys/matchimals-asc.env (see README, Deploying to TestFlight)."
      )
    )
  )
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=").map((part) => part.trim()))
);
const keyId = env.ASC_KEY_ID;
const issuerId = env.ASC_ISSUER_ID;
const keyPath =
  process.env.ASC_KEY_PATH ?? path.join(keysDir, `AuthKey_${keyId}.p8`);
if (!keyId || !issuerId) {
  fail("matchimals-asc.env must set ASC_KEY_ID and ASC_ISSUER_ID.");
}
const privateKey = createPrivateKey(
  await readFile(keyPath, "utf8").catch(() =>
    fail(`No API key file at ${keyPath}.`)
  )
);

const base64url = (input) => Buffer.from(input).toString("base64url");

// A fresh short-lived token per request batch (Apple caps them at 20 minutes)
let token = { value: "", expires: 0 };
const jwt = () => {
  const now = Math.floor(Date.now() / 1000);
  if (token.expires > now + 60) {
    return token.value;
  }
  const header = base64url(
    JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })
  );
  const payload = base64url(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 900,
      aud: "appstoreconnect-v1",
    })
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  token = {
    value: `${header}.${payload}.${base64url(signature)}`,
    expires: now + 900,
  };
  return token.value;
};

// --- API ----------------------------------------------------------------------

const api = async (method, url, body) => {
  const response = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) {
    return null;
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (json.errors ?? [])
      .map(
        (error) =>
          `${error.code ?? error.status}: ${error.detail ?? error.title}`
      )
      .join("; ");
    throw new Error(`${method} ${url} → ${response.status} ${detail}`);
  }
  return json;
};

// Follows pagination
const list = async (url) => {
  const items = [];
  let next = url;
  while (next) {
    const page = await api("GET", next);
    items.push(...page.data);
    next = page.links?.next;
  }
  return items;
};

// --- What's on disk ------------------------------------------------------------

const appJson = JSON.parse(await readFile(path.join(root, "app.json"), "utf8"));
const versionString = appJson.expo.version;

const readText = (dir, file) =>
  readFile(path.join(dir, file), "utf8").then((text) => text.trim());

const metadataDir = path.join(root, "store/metadata");
const storefronts = (await readdir(metadataDir))
  .filter((name) => !name.startsWith("."))
  .filter((name) => !onlyLocales || onlyLocales.includes(name))
  .sort();
const listing = {};
for (const locale of storefronts) {
  const dir = path.join(metadataDir, locale);
  listing[locale] = {
    name: await readText(dir, "name.txt"),
    subtitle: await readText(dir, "subtitle.txt"),
    description: await readText(dir, "description.txt"),
    keywords: await readText(dir, "keywords.txt"),
    promotionalText: await readText(dir, "promotional_text.txt"),
    whatsNew: await readText(dir, "release_notes.txt"),
  };
}
if (!storefronts.length) {
  fail("No storefronts to push.");
}

// --- App, version, localizations ---------------------------------------------

const main = async () => {
  const apps = await list(`/apps?filter[bundleId]=${BUNDLE_ID}`);
  const app =
    apps[0] ??
    fail(`No app with bundle id ${BUNDLE_ID} is visible to this key.`);
  log(
    `▸ ${app.attributes.name} (${
      app.id
    }) — pushing ${versionString} for ${storefronts.join(", ")}${
      dryRun ? " [dry run]" : ""
    }`
  );

  const versions = await list(
    `/apps/${app.id}/appStoreVersions?filter[platform]=IOS&fields[appStoreVersions]=versionString,appStoreState,appVersionState`
  );
  let version = versions.find(
    (v) => v.attributes.versionString === versionString
  );
  if (!version) {
    log(`▸ Creating App Store version ${versionString}`);
    if (!dryRun) {
      version = (
        await api("POST", "/appStoreVersions", {
          data: {
            type: "appStoreVersions",
            attributes: { platform: "IOS", versionString },
            relationships: { app: { data: { type: "apps", id: app.id } } },
          },
        })
      ).data;
    }
  } else {
    log(
      `▸ App Store version ${versionString} is ${
        version.attributes.appVersionState ?? version.attributes.appStoreState
      }`
    );
  }

  // The app-level name and subtitle live on the editable App Info (a new one
  // appears with a new version; the live one can't be changed)
  const appInfos = await list(
    `/apps/${app.id}/appInfos?fields[appInfos]=state,appStoreState`
  );
  const EDITABLE = new Set([
    "PREPARE_FOR_SUBMISSION",
    "DEVELOPER_REJECTED",
    "REJECTED",
    "METADATA_REJECTED",
    "WAITING_FOR_REVIEW",
    "IN_REVIEW",
    "PENDING_DEVELOPER_RELEASE",
    "READY_FOR_REVIEW",
  ]);
  const appInfo =
    appInfos.find((info) =>
      EDITABLE.has(info.attributes.state ?? info.attributes.appStoreState)
    ) ?? appInfos[appInfos.length - 1];
  const infoLocalizations = new Map(
    (await list(`/appInfos/${appInfo.id}/appInfoLocalizations`)).map((l) => [
      l.attributes.locale,
      l,
    ])
  );

  const readVersionLocalizations = async () =>
    new Map(
      version
        ? (
            await list(
              `/appStoreVersions/${version.id}/appStoreVersionLocalizations`
            )
          ).map((l) => [l.attributes.locale, l])
        : []
    );
  let versionLocalizations = await readVersionLocalizations();
  // New storefronts inherit the support/marketing URLs of the primary one
  const primary = versionLocalizations.get("en-US")?.attributes ?? {};

  const changed = (current, wanted) =>
    Object.entries(wanted).filter(
      ([key, value]) => (current[key] ?? "") !== value
    );

  // Name and subtitle, plus the app-wide privacy policy URL of the primary
  // storefront (every localization must carry one). Adding a storefront here
  // makes App Store Connect create its (empty) version localization as well,
  // hence the re-read below
  const primaryInfo = infoLocalizations.get("en-US")?.attributes ?? {};
  let addedStorefront = false;
  for (const locale of storefronts) {
    const wanted = listing[locale];
    const info = infoLocalizations.get(locale);
    const infoFields = { name: wanted.name, subtitle: wanted.subtitle };
    if (primaryInfo.privacyPolicyUrl) {
      infoFields.privacyPolicyUrl = primaryInfo.privacyPolicyUrl;
    }
    if (!info) {
      log(`  ${locale}: adding name/subtitle`);
      addedStorefront = true;
      if (!dryRun) {
        await api("POST", "/appInfoLocalizations", {
          data: {
            type: "appInfoLocalizations",
            attributes: { locale, ...infoFields },
            relationships: {
              appInfo: { data: { type: "appInfos", id: appInfo.id } },
            },
          },
        });
      }
    } else {
      const diff = changed(info.attributes, infoFields);
      if (diff.length) {
        log(`  ${locale}: updating ${diff.map(([k]) => k).join(", ")}`);
        if (!dryRun) {
          await api("PATCH", `/appInfoLocalizations/${info.id}`, {
            data: {
              type: "appInfoLocalizations",
              id: info.id,
              attributes: Object.fromEntries(diff),
            },
          });
        }
      }
    }
  }
  if (addedStorefront && !dryRun) {
    versionLocalizations = await readVersionLocalizations();
  }

  // Version text
  for (const locale of storefronts) {
    const wanted = listing[locale];
    // The support and marketing URLs are app-wide: every storefront gets the
    // primary one's
    const versionFields = {
      description: wanted.description,
      keywords: wanted.keywords,
      promotionalText: wanted.promotionalText,
      whatsNew: wanted.whatsNew,
    };
    for (const url of ["supportUrl", "marketingUrl"]) {
      if (primary[url]) {
        versionFields[url] = primary[url];
      }
    }
    let localization = versionLocalizations.get(locale);
    if (!localization) {
      log(`  ${locale}: adding version localization`);
      if (!dryRun) {
        localization = (
          await api("POST", "/appStoreVersionLocalizations", {
            data: {
              type: "appStoreVersionLocalizations",
              attributes: { locale, ...versionFields },
              relationships: {
                appStoreVersion: {
                  data: { type: "appStoreVersions", id: version.id },
                },
              },
            },
          })
        ).data;
        versionLocalizations.set(locale, localization);
      }
    } else {
      const diff = changed(localization.attributes, versionFields);
      if (diff.length) {
        log(`  ${locale}: updating ${diff.map(([k]) => k).join(", ")}`);
        if (!dryRun) {
          await api(
            "PATCH",
            `/appStoreVersionLocalizations/${localization.id}`,
            {
              data: {
                type: "appStoreVersionLocalizations",
                id: localization.id,
                attributes: Object.fromEntries(diff),
              },
            }
          );
        }
      } else {
        log(`  ${locale}: text up to date`);
      }
    }
  }

  // --- Screenshots ----------------------------------------------------------------

  const upload = async (set, file) => {
    const data = await readFile(file);
    const reservation = (
      await api("POST", "/appScreenshots", {
        data: {
          type: "appScreenshots",
          attributes: { fileName: path.basename(file), fileSize: data.length },
          relationships: {
            appScreenshotSet: {
              data: { type: "appScreenshotSets", id: set.id },
            },
          },
        },
      })
    ).data;
    for (const operation of reservation.attributes.uploadOperations) {
      const headers = Object.fromEntries(
        operation.requestHeaders.map(({ name, value }) => [name, value])
      );
      const response = await fetch(operation.url, {
        method: operation.method,
        headers,
        body: data.subarray(
          operation.offset,
          operation.offset + operation.length
        ),
      });
      if (!response.ok) {
        throw new Error(`Upload of ${file} failed: ${response.status}`);
      }
    }
    await api("PATCH", `/appScreenshots/${reservation.id}`, {
      data: {
        type: "appScreenshots",
        id: reservation.id,
        attributes: {
          uploaded: true,
          sourceFileChecksum: createHash("md5").update(data).digest("hex"),
        },
      },
    });
  };

  if (withScreenshots) {
    for (const locale of storefronts) {
      const localization = versionLocalizations.get(locale);
      if (!localization) {
        log(
          `  ${locale}: no version localization yet (dry run) — screenshots skipped`
        );
        continue;
      }
      const sets = new Map(
        (
          await list(
            `/appStoreVersionLocalizations/${localization.id}/appScreenshotSets`
          )
        ).map((set) => [set.attributes.screenshotDisplayType, set])
      );
      for (const [folder, displayType] of Object.entries(DISPLAYS)) {
        const dir = path.join(root, "screenshots", locale, folder);
        const files = (await readdir(dir).catch(() => []))
          .filter((name) => name.endsWith(".png"))
          .sort()
          .map((name) => path.join(dir, name));
        if (!files.length) {
          log(`  ${locale}/${folder}: no screenshots on disk`);
          continue;
        }
        let set = sets.get(displayType);
        const existing = set
          ? await list(`/appScreenshotSets/${set.id}/appScreenshots`)
          : [];
        if (existing.length && !replaceScreenshots) {
          log(
            `  ${locale}/${folder}: ${existing.length} already in App Store Connect (use --replace-screenshots)`
          );
          continue;
        }
        log(
          `  ${locale}/${folder}: uploading ${files.length}${
            existing.length ? ` (replacing ${existing.length})` : ""
          }`
        );
        if (dryRun) {
          continue;
        }
        if (!set) {
          set = (
            await api("POST", "/appScreenshotSets", {
              data: {
                type: "appScreenshotSets",
                attributes: { screenshotDisplayType: displayType },
                relationships: {
                  appStoreVersionLocalization: {
                    data: {
                      type: "appStoreVersionLocalizations",
                      id: localization.id,
                    },
                  },
                },
              },
            })
          ).data;
        }
        for (const shot of existing) {
          await api("DELETE", `/appScreenshots/${shot.id}`);
        }
        for (const file of files) {
          await upload(set, file);
          log(`    ✓ ${path.basename(file)}`);
        }
      }
    }
  }

  log(
    dryRun
      ? "▸ Dry run complete"
      : "▸ Done — review the listing in App Store Connect before submitting"
  );
};

main().catch((error) => fail(error.message ?? String(error)));
