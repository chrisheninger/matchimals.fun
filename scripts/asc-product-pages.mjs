// Creates or updates the app's Custom Product Pages in App Store Connect from
// store/product-pages.json: each page's name, its promotional text per
// storefront, and a captioned screenshot set from screenshots-captioned/ for
// every display — the way asc-listing.mjs pushes the main listing. Nothing is
// submitted for review: the pages stay in Prepare for Submission for the owner
// to add to a review submission in App Store Connect.
//
//   bun run asc:product-pages                        # create/update every page
//   bun run asc:product-pages --dry-run              # show what would change
//   bun run asc:product-pages --pages "travel"       # only these pages (keys of store/product-pages.json)
//   bun run asc:product-pages --replace-screenshots  # re-upload sets that already have screenshots
//
// store/product-pages.json:
//
//   { "travel": { "name": "Travel & Offline", "screenshots": "travel",
//                 "promotionalText": { "en-US": "…" } }, … }
//
// Authenticates with the App Store Connect API key in ~/.private_keys
// (matchimals-asc.env naming ASC_KEY_ID and ASC_ISSUER_ID, beside
// AuthKey_<id>.p8); the key never leaves this machine.
import { createHash, createPrivateKey, sign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const root = path.resolve(import.meta.dirname, "..");
const API = "https://api.appstoreconnect.apple.com/v1";
const BUNDLE_ID = "native.matchimals.fun";
// The display classes scripts/screenshots.sh captures, by output folder
const DISPLAYS = {
  "iphone-6.5": "APP_IPHONE_65",
  "ipad-13": "APP_IPAD_PRO_3GEN_129",
};
const PROMOTIONAL_TEXT_LIMIT = 170;
// Page versions that can still be edited; anything else (in review, live,
// replaced) gets a fresh version
const EDITABLE = new Set([
  "PREPARE_FOR_SUBMISSION",
  "READY_FOR_REVIEW",
  "REJECTED",
]);
const IN_REVIEW = new Set(["WAITING_FOR_REVIEW", "IN_REVIEW"]);

// --- Options ------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = flag("--dry-run");
const replaceScreenshots = flag("--replace-screenshots");
const onlyPages = option("--pages")?.split(/\s+/).filter(Boolean);

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

const relationship = (type, id) => ({ data: { type, id } });

// --- What's on disk ------------------------------------------------------------

const pagesConfig = JSON.parse(
  await readFile(path.join(root, "store/product-pages.json"), "utf8")
);
const pageKeys = Object.keys(pagesConfig).filter(
  (key) => !onlyPages || onlyPages.includes(key)
);
if (!pageKeys.length) {
  fail("No product pages to push.");
}
for (const key of pageKeys) {
  const page = pagesConfig[key];
  for (const [locale, text] of Object.entries(page.promotionalText)) {
    if (text.length > PROMOTIONAL_TEXT_LIMIT) {
      fail(
        `${key}: ${locale} promotional text is ${text.length} characters (limit ${PROMOTIONAL_TEXT_LIMIT}).`
      );
    }
  }
}

const screenshotFiles = async (set, locale, folder) => {
  const dir = path.join(root, "screenshots-captioned", set, locale, folder);
  return (await readdir(dir).catch(() => []))
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((name) => path.join(dir, name));
};

// --- Screenshots ----------------------------------------------------------------

const upload = async (set, file) => {
  const data = await readFile(file);
  const reservation = (
    await api("POST", "/appScreenshots", {
      data: {
        type: "appScreenshots",
        attributes: { fileName: path.basename(file), fileSize: data.length },
        relationships: {
          appScreenshotSet: relationship("appScreenshotSets", set.id),
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

const screenshotStates = (set) =>
  list(
    `/appScreenshotSets/${set.id}/appScreenshots?fields[appScreenshots]=fileName,assetDeliveryState`
  ).then((shots) =>
    shots.map((shot) => ({
      fileName: shot.attributes.fileName,
      state: shot.attributes.assetDeliveryState?.state,
    }))
  );

// App Store Connect processes uploads for a while; waits (a few minutes at
// most) for the set to settle
const awaitProcessing = async (set) => {
  const deadline = Date.now() + 5 * 60 * 1000;
  for (;;) {
    const shots = await screenshotStates(set);
    const pending = shots.filter((shot) => shot.state !== "COMPLETE");
    if (!pending.length || Date.now() > deadline) {
      return shots;
    }
    if (pending.some((shot) => shot.state === "FAILED")) {
      return shots;
    }
    await sleep(5000);
  }
};

const pushScreenshots = async (localization, locale, setName) => {
  const report = [];
  const sets = new Map(
    (
      await list(
        `/appCustomProductPageLocalizations/${localization.id}/appScreenshotSets`
      )
    ).map((set) => [set.attributes.screenshotDisplayType, set])
  );
  for (const [folder, displayType] of Object.entries(DISPLAYS)) {
    const files = await screenshotFiles(setName, locale, folder);
    if (!files.length) {
      log(`    ${locale}/${folder}: no screenshots on disk`);
      continue;
    }
    let set = sets.get(displayType);
    const existing = set ? await screenshotStates(set) : [];
    if (existing.length && !replaceScreenshots) {
      log(
        `    ${locale}/${folder}: ${existing.length} already in App Store Connect (use --replace-screenshots)`
      );
      report.push({ folder, shots: existing });
      continue;
    }
    log(
      `    ${locale}/${folder}: uploading ${files.length}${
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
              appCustomProductPageLocalization: relationship(
                "appCustomProductPageLocalizations",
                localization.id
              ),
            },
          },
        })
      ).data;
    }
    for (const shot of await list(
      `/appScreenshotSets/${set.id}/appScreenshots`
    )) {
      await api("DELETE", `/appScreenshots/${shot.id}`);
    }
    for (const file of files) {
      await upload(set, file);
      log(`      ✓ ${path.basename(file)}`);
    }
    report.push({ folder, shots: await awaitProcessing(set) });
  }
  return report;
};

// --- Pages, versions, localizations -------------------------------------------------

const main = async () => {
  const apps = await list(`/apps?filter[bundleId]=${BUNDLE_ID}`);
  const app =
    apps[0] ??
    fail(`No app with bundle id ${BUNDLE_ID} is visible to this key.`);
  log(
    `▸ ${app.attributes.name} (${
      app.id
    }) — custom product pages ${pageKeys.join(", ")}${
      dryRun ? " [dry run]" : ""
    }`
  );

  const pages = await list(
    `/apps/${app.id}/appCustomProductPages?fields[appCustomProductPages]=name,url,visible`
  );
  const summary = [];

  for (const key of pageKeys) {
    const wanted = pagesConfig[key];
    let page = pages.find((p) => p.attributes.name === wanted.name);
    if (!page) {
      log(`▸ ${wanted.name}: creating`);
      if (dryRun) {
        for (const locale of Object.keys(wanted.promotionalText)) {
          log(`  ${locale}: adding promotional text`);
          for (const folder of Object.keys(DISPLAYS)) {
            const files = await screenshotFiles(
              wanted.screenshots,
              locale,
              folder
            );
            log(`    ${locale}/${folder}: uploading ${files.length}`);
          }
        }
        continue;
      }
      // A page is born with its first version and that version's
      // localizations, tied together with placeholder ids
      const locales = Object.entries(wanted.promotionalText);
      const localizationId = (i) => "${localization-" + i + "}";
      page = (
        await api("POST", "/appCustomProductPages", {
          data: {
            type: "appCustomProductPages",
            attributes: { name: wanted.name },
            relationships: {
              app: relationship("apps", app.id),
              appCustomProductPageVersions: {
                data: [
                  { type: "appCustomProductPageVersions", id: "${version}" },
                ],
              },
            },
          },
          included: [
            {
              type: "appCustomProductPageVersions",
              id: "${version}",
              relationships: {
                appCustomProductPageLocalizations: {
                  data: locales.map((_, i) => ({
                    type: "appCustomProductPageLocalizations",
                    id: localizationId(i),
                  })),
                },
              },
            },
            ...locales.map(([locale, promotionalText], i) => ({
              type: "appCustomProductPageLocalizations",
              id: localizationId(i),
              attributes: { locale, promotionalText },
            })),
          ],
        })
      ).data;
    } else {
      log(`▸ ${wanted.name} (${page.id})`);
    }

    const versions = await list(
      `/appCustomProductPages/${page.id}/appCustomProductPageVersions?fields[appCustomProductPageVersions]=version,state`
    );
    let version = versions.find((v) => EDITABLE.has(v.attributes.state));
    if (!version) {
      const busy = versions.find((v) => IN_REVIEW.has(v.attributes.state));
      if (busy) {
        log(
          `  version ${busy.attributes.version} is ${busy.attributes.state} — nothing can change until review finishes`
        );
        summary.push({ key, page, version: busy, report: [] });
        continue;
      }
      log(
        `  creating a new version${
          versions.length
            ? ` (${versions
                .map((v) => `${v.attributes.version} ${v.attributes.state}`)
                .join(", ")})`
            : ""
        }`
      );
      if (dryRun) {
        continue;
      }
      version = (
        await api("POST", "/appCustomProductPageVersions", {
          data: {
            type: "appCustomProductPageVersions",
            relationships: {
              appCustomProductPage: relationship(
                "appCustomProductPages",
                page.id
              ),
            },
          },
        })
      ).data;
    } else {
      log(
        `  version ${version.attributes.version} (${version.id}) is ${version.attributes.state}`
      );
    }

    const localizations = new Map(
      (
        await list(
          `/appCustomProductPageVersions/${version.id}/appCustomProductPageLocalizations`
        )
      ).map((l) => [l.attributes.locale, l])
    );
    const report = [];
    for (const [locale, promotionalText] of Object.entries(
      wanted.promotionalText
    )) {
      let localization = localizations.get(locale);
      if (!localization) {
        log(`  ${locale}: adding promotional text`);
        if (!dryRun) {
          localization = (
            await api("POST", "/appCustomProductPageLocalizations", {
              data: {
                type: "appCustomProductPageLocalizations",
                attributes: { locale, promotionalText },
                relationships: {
                  appCustomProductPageVersion: relationship(
                    "appCustomProductPageVersions",
                    version.id
                  ),
                },
              },
            })
          ).data;
        }
      } else if (
        (localization.attributes.promotionalText ?? "") !== promotionalText
      ) {
        log(`  ${locale}: updating promotional text`);
        if (!dryRun) {
          await api(
            "PATCH",
            `/appCustomProductPageLocalizations/${localization.id}`,
            {
              data: {
                type: "appCustomProductPageLocalizations",
                id: localization.id,
                attributes: { promotionalText },
              },
            }
          );
        }
      } else {
        log(`  ${locale}: promotional text up to date`);
      }
      if (!localization) {
        for (const folder of Object.keys(DISPLAYS)) {
          const files = await screenshotFiles(
            wanted.screenshots,
            locale,
            folder
          );
          log(`    ${locale}/${folder}: uploading ${files.length}`);
        }
        continue;
      }
      report.push(
        ...(
          await pushScreenshots(localization, locale, wanted.screenshots)
        ).map((entry) => ({ locale, ...entry }))
      );
    }
    summary.push({ key, page, version, report });
  }

  if (dryRun) {
    log("▸ Dry run complete");
    return;
  }
  log("▸ Done — nothing was submitted for review");
  for (const { page, version, report } of summary) {
    log(`  ${page.attributes.name}`);
    log(`    page ${page.id} · ${page.attributes.url}`);
    log(
      `    version ${version.attributes.version} ${version.id} · ${version.attributes.state}`
    );
    for (const { locale, folder, shots } of report) {
      log(
        `    ${locale}/${folder}: ${shots
          .map((shot) => `${shot.fileName} ${shot.state}`)
          .join(", ")}`
      );
    }
  }
  log(
    `  Submit them from https://appstoreconnect.apple.com/apps/${app.id}/distribution (App Store → Custom Product Pages)`
  );
};

main().catch((error) => fail(error.message ?? String(error)));
