// Uploads the App Store previews in store/previews/ to App Store Connect: one
// per display class (the 6.5" iPhone and the 13" iPad App Preview sets) for
// every localization of the version that is open for editing, and points each
// one's poster frame at the filled board. Nothing else on the version is
// touched and nothing is submitted for review.
//
//   bun run asc:previews                   # every localization of the editable version
//   bun run asc:previews --dry-run         # show what would be uploaded
//   bun run asc:previews --locales "ja ko" # only these localizations
//   bun run asc:previews --replace         # re-upload previews that are already there
//   bun run asc:previews --frame 00:00:18:00  # poster frame (default: two thirds in)
//   bun run asc:previews --status          # what App Store Connect holds, nothing uploaded
//
// Authenticates with the App Store Connect API key in ~/.private_keys
// (matchimals-asc.env naming ASC_KEY_ID and ASC_ISSUER_ID, beside
// AuthKey_<id>.p8); the key never leaves this machine.
import { createHash, createPrivateKey, sign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const API = "https://api.appstoreconnect.apple.com/v1";
const BUNDLE_ID = "native.matchimals.fun";
// The previews encode.sh in the marketing site repo produces, by App Store
// Connect display class (the counterparts of the screenshot sets)
const PREVIEWS = {
  "app-preview-iphone-6.5.mp4": "IPHONE_65",
  "app-preview-ipad-13.mp4": "IPAD_PRO_3GEN_129",
};
// App Store Connect processes the video after the upload; these are how long
// to wait for it and how often to ask
const PROCESSING_TIMEOUT_MS = 20 * 60 * 1000;
const POLL_INTERVAL_MS = 15 * 1000;
// The poster frame, as a fraction of the preview's duration
const POSTER_AT = 2 / 3;
const FPS = 30;

// --- Options ------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = flag("--dry-run");
const replace = flag("--replace");
const statusOnly = flag("--status");
const onlyLocales = option("--locales")?.split(/\s+/).filter(Boolean);
const frameOption = option("--frame");
if (frameOption && !/^\d\d:\d\d:\d\d:\d\d$/.test(frameOption)) {
  console.error("✖ --frame takes a timecode like 00:00:18:00 (HH:MM:SS:FF).");
  process.exit(1);
}

const log = (message) => console.log(message);
const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const previewsDir = path.join(root, "store/previews");
const files = (await readdir(previewsDir).catch(() => [])).filter(
  (name) => PREVIEWS[name]
);
if (!files.length) {
  fail(
    `No previews in store/previews — expected ${Object.keys(PREVIEWS).join(
      " and "
    )} (encode them with the marketing site's record-gameplay scripts).`
  );
}
// The movie's duration in milliseconds, from the mp4's movie header
const mp4Duration = (data) => {
  const find = (start, end, type) => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = data.readUInt32BE(offset);
      const name = data.toString("latin1", offset + 4, offset + 8);
      let header = 8;
      if (size === 1) {
        size = Number(data.readBigUInt64BE(offset + 8));
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (name === type) {
        return { start: offset + header, end: offset + size };
      }
      offset += size;
    }
    return null;
  };
  const moov = find(0, data.length, "moov");
  const mvhd = moov && find(moov.start, moov.end, "mvhd");
  if (!mvhd) {
    return null;
  }
  const version = data[mvhd.start];
  const timescale = data.readUInt32BE(mvhd.start + (version === 1 ? 20 : 12));
  const duration =
    version === 1
      ? Number(data.readBigUInt64BE(mvhd.start + 24))
      : data.readUInt32BE(mvhd.start + 16);
  return (duration / timescale) * 1000;
};

// HH:MM:SS:FF for a point in the video
const timecode = (ms) => {
  const totalFrames = Math.floor((ms / 1000) * FPS);
  const frames = totalFrames % FPS;
  const seconds = Math.floor(totalFrames / FPS);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(seconds / 3600))}:${pad(
    Math.floor(seconds / 60) % 60
  )}:${pad(seconds % 60)}:${pad(frames)}`;
};

const videos = new Map();
for (const name of files) {
  const data = await readFile(path.join(previewsDir, name));
  const duration = mp4Duration(data);
  if (!duration && !frameOption) {
    fail(`Can't read the duration of ${name} — pass --frame.`);
  }
  videos.set(name, {
    name,
    previewType: PREVIEWS[name],
    data,
    checksum: createHash("md5").update(data).digest("hex"),
    frame: frameOption ?? timecode(duration * POSTER_AT),
  });
}

// --- Upload ---------------------------------------------------------------------

// Reserves, uploads and commits one preview; App Store Connect processes it
// from there (see `finish`)
const upload = async (set, video) => {
  const reservation = (
    await api("POST", "/appPreviews", {
      data: {
        type: "appPreviews",
        attributes: {
          fileName: video.name,
          fileSize: video.data.length,
          mimeType: "video/mp4",
        },
        relationships: {
          appPreviewSet: { data: { type: "appPreviewSets", id: set.id } },
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
      body: video.data.subarray(
        operation.offset,
        operation.offset + operation.length
      ),
    });
    if (!response.ok) {
      throw new Error(`Upload of ${video.name} failed: ${response.status}`);
    }
  }
  await api("PATCH", `/appPreviews/${reservation.id}`, {
    data: {
      type: "appPreviews",
      id: reservation.id,
      attributes: { uploaded: true, sourceFileChecksum: video.checksum },
    },
  });
  return reservation.id;
};

const setPoster = (id, frame) =>
  api("PATCH", `/appPreviews/${id}`, {
    data: {
      type: "appPreviews",
      id,
      attributes: { previewFrameTimeCode: frame },
    },
  });

// Waits for App Store Connect to finish processing, then points the poster
// frame at the filled board (the frame can only be chosen once the video has
// been processed)
const finish = async (pending) => {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  const results = [];
  let waiting = [...pending];
  while (waiting.length) {
    const still = [];
    for (const item of waiting) {
      const preview = (await api("GET", `/appPreviews/${item.id}`)).data;
      const state = preview.attributes.assetDeliveryState ?? {};
      if (state.state === "COMPLETE") {
        const frame =
          frameOption ??
          (preview.attributes.duration
            ? timecode(preview.attributes.duration * POSTER_AT)
            : undefined);
        let note = "";
        if (frame) {
          await api("PATCH", `/appPreviews/${item.id}`, {
            data: {
              type: "appPreviews",
              id: item.id,
              attributes: { previewFrameTimeCode: frame },
            },
          }).catch((error) => {
            note = ` (poster frame not set: ${error.message})`;
          });
        }
        log(
          `  ✓ ${item.label}: COMPLETE${
            frame ? `, poster at ${frame}` : ""
          }${note}`
        );
        results.push({ ...item, state: "COMPLETE" });
      } else if (state.state === "FAILED") {
        const why = (state.errors ?? [])
          .map((error) => error.description ?? error.code)
          .join("; ");
        log(`  ✖ ${item.label}: FAILED${why ? ` — ${why}` : ""}`);
        results.push({ ...item, state: "FAILED" });
      } else {
        still.push(item);
      }
    }
    waiting = still;
    if (waiting.length) {
      if (Date.now() > deadline) {
        for (const item of waiting) {
          log(`  … ${item.label}: still processing — check App Store Connect`);
          results.push({ ...item, state: "PROCESSING" });
        }
        break;
      }
      log(`  … ${waiting.length} still processing`);
      await sleep(POLL_INTERVAL_MS);
    }
  }
  return results;
};

// --- App, version, localizations ---------------------------------------------

const main = async () => {
  const apps = await list(`/apps?filter[bundleId]=${BUNDLE_ID}`);
  const app =
    apps[0] ??
    fail(`No app with bundle id ${BUNDLE_ID} is visible to this key.`);

  // Previews can only be added to a version that hasn't been submitted
  const EDITABLE = new Set([
    "PREPARE_FOR_SUBMISSION",
    "READY_FOR_REVIEW",
    "DEVELOPER_REJECTED",
    "REJECTED",
    "METADATA_REJECTED",
    "INVALID_BINARY",
  ]);
  const versions = (
    await list(
      `/apps/${app.id}/appStoreVersions?filter[platform]=IOS&fields[appStoreVersions]=versionString,appStoreState,appVersionState`
    )
  ).filter((v) =>
    EDITABLE.has(v.attributes.appVersionState ?? v.attributes.appStoreState)
  );
  const version =
    versions.find((v) => v.attributes.versionString === versionString) ??
    versions[0] ??
    fail("No App Store version is open for editing.");
  log(
    `▸ ${app.attributes.name} (${app.id}) — ${
      version.attributes.versionString
    } is ${
      version.attributes.appVersionState ?? version.attributes.appStoreState
    }; ${
      statusOnly ? "previews" : `uploading ${[...videos.keys()].join(", ")}`
    }${dryRun ? " [dry run]" : ""}`
  );

  const localizations = (
    await list(
      `/appStoreVersions/${version.id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale`
    )
  )
    .filter((l) => !onlyLocales || onlyLocales.includes(l.attributes.locale))
    .sort((a, b) => a.attributes.locale.localeCompare(b.attributes.locale));
  if (!localizations.length) {
    fail("No localizations to upload to.");
  }

  const pending = [];
  for (const localization of localizations) {
    const locale = localization.attributes.locale;
    const sets = new Map(
      (
        await list(
          `/appStoreVersionLocalizations/${localization.id}/appPreviewSets`
        )
      ).map((set) => [set.attributes.previewType, set])
    );
    for (const video of videos.values()) {
      const label = `${locale}/${video.previewType}`;
      let set = sets.get(video.previewType);
      const existing = set
        ? await list(`/appPreviewSets/${set.id}/appPreviews`)
        : [];
      const same = existing.filter(
        (preview) => preview.attributes.fileName === video.name
      );
      if (statusOnly) {
        for (const preview of existing) {
          const a = preview.attributes;
          log(
            `  ${label}: ${a.fileName} ${a.assetDeliveryState?.state}${
              a.previewFrameTimeCode
                ? `, poster at ${a.previewFrameTimeCode}`
                : ""
            }`
          );
        }
        if (!existing.length) {
          log(`  ${label}: none`);
        }
        continue;
      }
      if (same.length && !replace) {
        // A re-run after an interrupted one still gets the poster frame set
        for (const preview of same) {
          const a = preview.attributes;
          if (
            a.assetDeliveryState?.state === "COMPLETE" &&
            a.previewFrameTimeCode !== video.frame
          ) {
            log(
              `  ${label}: ${video.name} already there — poster at ${video.frame}`
            );
            if (!dryRun) {
              await setPoster(preview.id, video.frame);
            }
          } else {
            log(
              `  ${label}: ${video.name} already there, ${a.assetDeliveryState?.state} (use --replace)`
            );
          }
        }
        continue;
      }
      // A set holds at most three previews; ours replaces its namesake only
      if (existing.length - same.length >= 3) {
        log(`  ${label}: set already holds three other previews — skipped`);
        continue;
      }
      log(
        `  ${label}: uploading ${video.name}${
          same.length ? ` (replacing ${same.length})` : ""
        }`
      );
      if (dryRun) {
        continue;
      }
      if (!set) {
        set = (
          await api("POST", "/appPreviewSets", {
            data: {
              type: "appPreviewSets",
              attributes: { previewType: video.previewType },
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
        sets.set(video.previewType, set);
      }
      for (const preview of same) {
        await api("DELETE", `/appPreviews/${preview.id}`);
      }
      const id = await upload(set, video);
      pending.push({
        id,
        label,
        locale,
        previewType: video.previewType,
        frame: video.frame,
      });
    }
  }

  if (statusOnly) {
    return;
  }
  if (dryRun) {
    log("▸ Dry run complete");
    return;
  }
  if (!pending.length) {
    log("▸ Nothing to upload");
    return;
  }
  log(`▸ Uploaded ${pending.length}; waiting for App Store Connect to process`);
  const results = await finish(pending);
  const byLocale = new Map();
  for (const result of results) {
    const entries = byLocale.get(result.locale) ?? [];
    entries.push(`${result.previewType} ${result.state}`);
    byLocale.set(result.locale, entries);
  }
  log("▸ Results");
  for (const [locale, entries] of byLocale) {
    log(`  ${locale}: ${entries.join(", ")}`);
  }
  const failed = results.filter((result) => result.state !== "COMPLETE");
  if (failed.length) {
    fail(`${failed.length} preview(s) did not complete.`);
  }
  log("▸ Done — review the previews in App Store Connect before submitting");
};

main().catch((error) => fail(error.message ?? String(error)));
