// Lays captions over the App Store screenshots in screenshots/: a caption band
// across the top, set in Dimbo on a sticker pill over the main menu's
// trianglify background, with the screenshot below it framed like a device
// screen. App Store search shows screenshots as thumbnails, so the caption is
// sized to read at ~120 px wide. Nothing here touches the simulator — it only
// composes what `bun run screenshots` already captured.
//
//   bun run screenshots:caption                         # every set in store/captions, every storefront it has captions for
//   bun run screenshots:caption --sets "family travel"  # only these sets
//   bun run screenshots:caption --locales "en-US de-DE" # only these storefronts (failing on a missing caption)
//   bun run screenshots:caption --displays "iphone-6.5"
//   bun run screenshots:caption --out <dir>             # somewhere other than screenshots-captioned/
//
// A caption set is store/captions/<set>.json: display ("*" for every display,
// or a display folder name to override it) → state (A–E, Victory) → App Store
// Connect locale → text, with "\n" breaking the (at most two) lines:
//
//   { "*": { "A": { "en-US": "Match the animals,\nscore the points" }, … } }
//
// Output lands in screenshots-captioned/<set>/<storefront>/<display>/<n>-<state>.png
// at the slot's exact pixel size (asserted), ready for
// `bun run asc:listing --screenshots-dir screenshots-captioned/<set>` or
// `bun run asc:product-pages`. Needs ImageMagick 7 (`magick`).
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import * as fontkit from "fontkit";

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const fontPath = path.join(root, "assets/fonts/Dimbo.ttf");
const backgroundPath = path.join(root, "src/MainMenu/trianglify.png");
const captionsDir = path.join(root, "store/captions");
const screenshotsDir = path.join(root, "screenshots");

// The slot sizes scripts/screenshots.sh captures. `band` is the caption's
// share of the height (the framed screenshot takes the rest) and `fontSize`
// the caption's type size; the frame is scaled from the width and the pill
// from the type size, so the two displays read alike.
const DISPLAYS = {
  "iphone-6.5": { width: 1284, height: 2778, band: 580, fontSize: 150 },
  "ipad-13": { width: 2064, height: 2752, band: 580, fontSize: 172 },
};
const MAX_LINES = 2;
// A caption wider than the band shrinks this far before the script gives up
// and asks for shorter wording
const MIN_SCALE = 0.8;
// Dimbo's line box is loose for display sizes
const LINE_HEIGHT = 1.02;
// The pill around the caption, in ems: padding, white edge, dark line, corner
const PILL = { padX: 0.35, padY: 0.18, edge: 0.09, line: 0.04, radius: 0.4 };

const DARK = "#17171B";
const WHITE = "#FFFFFF";

// --- Options ------------------------------------------------------------------

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const words = (value) => value?.split(/\s+/).filter(Boolean);
const onlySets = words(option("--sets"));
const onlyLocales = words(option("--locales"));
const onlyDisplays = words(option("--displays"));
const outDir = path.resolve(root, option("--out") ?? "screenshots-captioned");

const log = (message) => console.log(message);
const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

// --- Type ---------------------------------------------------------------------

const font = fontkit.openSync(fontPath);
const glyphs = new Set(font.characterSet);
const naturalLineHeight =
  (font.ascent - font.descent + font.lineGap) / font.unitsPerEm;

const measure = (text, size) =>
  (font.layout(text).advanceWidth / font.unitsPerEm) * size;

// Checks a caption and sizes it for a display: its lines, the type size it
// fits at, and the box the text needs
const layout = (text, display, where) => {
  const lines = text.split("\n");
  if (lines.length > MAX_LINES) {
    fail(`${where}: more than ${MAX_LINES} lines`);
  }
  const missing = [...text.replace(/\n/g, "")].filter(
    (c) => !glyphs.has(c.codePointAt(0))
  );
  if (missing.length) {
    fail(`${where}: Dimbo lacks ${[...new Set(missing)].join(" ")}`);
  }
  const { width, fontSize } = DISPLAYS[display];
  // What's left once the pill keeps its margin to the canvas
  const margin = Math.round(48 * (width / 1284));
  const maxWidth =
    width - 2 * margin - 2 * (PILL.padX + PILL.edge + PILL.line) * fontSize;
  const widest = Math.max(...lines.map((line) => measure(line, fontSize)));
  let size = fontSize;
  if (widest > maxWidth) {
    size = Math.floor((fontSize * maxWidth) / widest);
    if (size < fontSize * MIN_SCALE) {
      fail(`${where}: "${lines.join(" / ")}" is too long — shorten it`);
    }
    log(`  ! ${where}: shrinking to ${size}px to fit`);
  }
  return {
    lines,
    size,
    textWidth: Math.ceil((widest * size) / fontSize),
    textHeight: Math.ceil(lines.length * size * LINE_HEIGHT),
  };
};

// ImageMagick expands %-escapes and backslashes in label text
const labelText = (lines) =>
  lines.join("\n").replace(/\\/g, "\\\\").replace(/%/g, "%%");

// --- Composition ------------------------------------------------------------------

const round = (x0, y0, x1, y1, r) =>
  `roundrectangle ${x0},${y0} ${x1},${y1} ${r},${r}`;

// A soft shadow under a rounded rectangle, as a full-canvas layer. Blurred at
// a quarter of the size — a wide blur is the slow part, and the result is
// the same
const shadow = (W, H, x0, y0, x1, y1, r, u) => {
  const s = 4;
  return [
    "(",
    "-size",
    `${Math.ceil(W / s)}x${Math.ceil(H / s)}`,
    "xc:none",
    "-fill",
    "rgba(0,0,0,0.35)",
    "-draw",
    round(x0 / s, (y0 + 16 * u) / s, x1 / s, (y1 + 16 * u) / s, r / s),
    "-blur",
    `0x${(20 * u) / s}`,
    "-resize",
    `${W}x${H}!`,
    ")",
    "-composite",
  ];
};

// The caption on a white sticker pill — white edge, dark line — with a shadow
const pill = (caption, display) => {
  const { width: W, height: H, band } = DISPLAYS[display];
  const { size } = caption;
  const padX = Math.round(PILL.padX * size);
  const padY = Math.round(PILL.padY * size);
  const edge = Math.round(PILL.edge * size);
  const line = Math.round(PILL.line * size);
  const r = Math.round(PILL.radius * size);
  const innerW = caption.textWidth + 2 * padX;
  const innerH = caption.textHeight + 2 * padY;
  const outerW = innerW + 2 * (edge + line);
  const outerH = innerH + 2 * (edge + line);
  const x = Math.round((W - outerW) / 2);
  const y = Math.round((band - outerH) / 2);
  return [
    ...shadow(W, H, x, y, x + outerW, y + outerH, r, W / 1284),
    "-fill",
    WHITE,
    "-draw",
    round(x, y, x + outerW, y + outerH, r),
    "-fill",
    DARK,
    "-draw",
    round(x + edge, y + edge, x + outerW - edge, y + outerH - edge, r - edge),
    "-fill",
    WHITE,
    "-draw",
    round(
      x + edge + line,
      y + edge + line,
      x + outerW - edge - line,
      y + outerH - edge - line,
      r - edge - line
    ),
    "(",
    "-size",
    `${innerW}x${innerH}`,
    "-background",
    "none",
    "-font",
    fontPath,
    "-pointsize",
    `${size}`,
    "-interline-spacing",
    `${Math.round((LINE_HEIGHT - naturalLineHeight) * size)}`,
    "-gravity",
    "center",
    "-fill",
    DARK,
    `label:${labelText(caption.lines)}`,
    ")",
    // Settings leak out of the parentheses
    "-gravity",
    "northwest",
    "-geometry",
    `+${x + edge + line}+${y + edge + line}`,
    "-composite",
  ];
};

const compose = async (source, output, caption, display) => {
  const { width: W, height: H, band } = DISPLAYS[display];
  const u = W / 1284;
  // The framed screenshot: dark line, white sticker edge, shadow
  const edge = Math.round(16 * u);
  const line = Math.round(6 * u);
  const bottom = Math.round(64 * u);
  const frameH = H - band - bottom;
  const shotH = frameH - 2 * (edge + line);
  const shotW = Math.round((shotH * W) / H);
  const frameW = shotW + 2 * (edge + line);
  const fx = Math.round((W - frameW) / 2);
  const fy = band;
  const r = Math.round(60 * u);
  await exec("magick", [
    backgroundPath,
    "-resize",
    `${W}x${H}^`,
    "-gravity",
    "center",
    "-extent",
    `${W}x${H}`,
    "-gravity",
    "northwest",
    ...shadow(W, H, fx, fy, fx + frameW, fy + frameH, r + edge + line, u),
    "-fill",
    WHITE,
    "-draw",
    round(fx, fy, fx + frameW, fy + frameH, r + edge + line),
    "-fill",
    DARK,
    "-draw",
    round(
      fx + edge,
      fy + edge,
      fx + frameW - edge,
      fy + frameH - edge,
      r + line
    ),
    "(",
    source,
    "-resize",
    `${shotW}x${shotH}!`,
    "(",
    "+clone",
    "-fill",
    "black",
    "-colorize",
    "100",
    "-fill",
    "white",
    "-draw",
    round(0, 0, shotW - 1, shotH - 1, r),
    ")",
    "-alpha",
    "off",
    "-compose",
    "CopyOpacity",
    "-composite",
    ")",
    "-compose",
    "Over",
    "-geometry",
    `+${fx + edge + line}+${fy + edge + line}`,
    "-composite",
    ...pill(caption, display),
    "-strip",
    "-define",
    "png:compression-level=9",
    output,
  ]);
  const { stdout } = await exec("magick", [
    "identify",
    "-format",
    "%wx%h",
    output,
  ]);
  if (stdout !== `${W}x${H}`) {
    fail(`${output} is ${stdout}; App Store Connect wants ${W}x${H}.`);
  }
};

// --- Sets, storefronts, screenshots ---------------------------------------------------

const main = async () => {
  await exec("magick", ["-version"]).catch(() =>
    fail("ImageMagick 7 (`magick`) is required — brew install imagemagick")
  );
  const sets = (await readdir(captionsDir))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -5))
    .filter((name) => !onlySets || onlySets.includes(name))
    .sort();
  if (!sets.length) {
    fail(`No caption sets in ${captionsDir}.`);
  }
  const storefronts = (await readdir(screenshotsDir))
    .filter((name) => !name.startsWith("."))
    .filter((name) => !onlyLocales || onlyLocales.includes(name))
    .sort();
  const displays = Object.keys(DISPLAYS).filter(
    (name) => !onlyDisplays || onlyDisplays.includes(name)
  );

  const jobs = [];
  for (const set of sets) {
    const captions = JSON.parse(
      await readFile(path.join(captionsDir, `${set}.json`), "utf8")
    );
    for (const storefront of storefronts) {
      for (const display of displays) {
        const dir = path.join(screenshotsDir, storefront, display);
        const files = (await readdir(dir).catch(() => []))
          .filter((name) => name.endsWith(".png"))
          .sort();
        if (!files.length) {
          continue;
        }
        const wanted = [];
        let missing;
        for (const file of files) {
          const state = file.match(/^\d+-[a-z]+Player(\w+)\.png$/)?.[1];
          const text = (captions[display]?.[state] ?? captions["*"]?.[state])?.[
            storefront
          ];
          if (!state || !text) {
            missing = file;
            break;
          }
          wanted.push({ file, text, where: `${set} ${display} ${state}` });
        }
        if (missing) {
          if (onlyLocales) {
            fail(`${set}: no ${storefront} caption for ${missing}`);
          }
          log(`▸ ${set} · ${storefront}/${display}: no captions — skipped`);
          continue;
        }
        const target = path.join(outDir, set, storefront, display);
        await rm(target, { recursive: true, force: true });
        await mkdir(target, { recursive: true });
        for (const { file, text, where } of wanted) {
          jobs.push({
            source: path.join(dir, file),
            output: path.join(target, file),
            caption: layout(text, display, where),
            display,
            label: `${set} · ${storefront}/${display}/${file}`,
          });
        }
      }
    }
  }
  if (!jobs.length) {
    fail("Nothing to caption.");
  }

  log(`▸ Composing ${jobs.length} screenshots…`);
  const workers = Math.min(4, os.availableParallelism?.() ?? 2);
  let next = 0;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        await compose(job.source, job.output, job.caption, job.display);
        log(`  ✓ ${job.label}`);
      }
    })
  );
  log(`▸ Done: ${path.relative(root, outDir)}/`);
};

main().catch((error) => fail(error.message ?? String(error)));
