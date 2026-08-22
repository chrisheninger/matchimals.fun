// Checks the translations and the App Store metadata:
//
//   bun run check:locales
//
// - every locale has exactly the keys of src/locales/en.ts, with the same
//   {placeholders}
// - every string of a Dimbo-rendered locale (natural and upper case) uses only
//   glyphs assets/fonts/Dimbo.ttf has — anything else would draw as a box
// - strings fit the fixed-width slots they're drawn in (measured in Dimbo;
//   estimated for platform-font locales): hard slots fail, loose ones warn
// - store/metadata/<locale>/ is complete and within App Store Connect's limits
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import * as fontkit from "fontkit";

import { locales } from "../src/locales/index.ts";

const root = path.resolve(import.meta.dirname, "..");
const font = fontkit.openSync(path.join(root, "assets/fonts/Dimbo.ttf"));
const glyphs = new Set(font.characterSet);

// Where each app locale's listing lives (App Store Connect's locale codes)
const STORE_LOCALES = {
  en: "en-US",
  es: "es-ES",
  "es-MX": "es-MX",
  "pt-BR": "pt-BR",
  de: "de-DE",
  fr: "fr-FR",
  it: "it",
  ja: "ja",
  ko: "ko",
  "zh-Hans": "zh-Hans",
};
const STORE_LIMITS = {
  "name.txt": 30,
  "subtitle.txt": 30,
  "keywords.txt": 100,
  "promotional_text.txt": 170,
  "description.txt": 4000,
  "release_notes.txt": 4000,
};

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const flatten = (object, prefix = "") =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]]
  );

const placeholders = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");

// Advance width in px; Dimbo for Latin locales, a 1em-per-ideograph estimate
// (0.55em for anything else) where the platform font draws the text
const measure = (text, px, dimbo) => {
  if (dimbo) {
    return (font.layout(text).advanceWidth / font.unitsPerEm) * px;
  }
  return [...text].reduce(
    (sum, c) => sum + (/[ᄀ-￯]/.test(c) ? 1 : 0.55) * px,
    0
  );
};

const upper = (text, locale) => text.toLocaleUpperCase(locale);

// --- Keys, placeholders, glyphs, widths ------------------------------------

const en = flatten(locales.en);
const enKeys = new Map(en);

for (const [code, strings] of Object.entries(locales)) {
  const entries = flatten(strings);
  const keys = new Map(entries);
  for (const key of enKeys.keys()) {
    if (!keys.has(key)) {
      fail(`${code}: missing key ${key}`);
    }
  }
  for (const [key, value] of entries) {
    if (!enKeys.has(key)) {
      fail(`${code}: unknown key ${key}`);
    } else if (
      typeof value === "string" &&
      placeholders(value) !== placeholders(enKeys.get(key))
    ) {
      fail(`${code}: ${key} placeholders differ from English ("${value}")`);
    }
  }

  const dimbo = strings.font === "Dimbo";
  if (dimbo) {
    for (const [key, value] of entries) {
      if (typeof value !== "string") {
        continue;
      }
      for (const text of [value, upper(value, code)]) {
        const missing = [...text].filter((c) => !glyphs.has(c.codePointAt(0)));
        if (missing.length) {
          fail(
            `${code}: ${key} uses glyphs Dimbo lacks: ${[
              ...new Set(missing),
            ].join(" ")}`
          );
        }
      }
    }
  }

  // Slot budgets, from the components' fixed dimensions
  const slots = [
    // Toggle: SEGMENT_WIDTH 150, label 26px, inner border 4 each side
    ["easyMode", upper(strings.easyMode, code), 26, 140, true],
    ["classic", upper(strings.classic, code), 26, 140, true],
    // MainMenu caption: width 320, 22px, one line
    ["easyCaption", strings.easyCaption, 22, 320, true],
    ["classicCaption", strings.classicCaption, 22, 320, true],
    // Switch: HALF_WIDTH 40, label 18px
    ["on", upper(strings.on, code), 18, 40, true],
    ["off", upper(strings.off, code), 18, 40, true],
    // Dialog buttons: card 360 − padding 16 − borders 16 − paddingHorizontal
    // 64 = 264, minus the 28px icon and 12px gap where there is one; 32px
    ["settings (button)", upper(strings.settings, code), 32, 224, true],
    ["scrollToCenter", upper(strings.scrollToCenter, code), 32, 224, true],
    ["exitToMainMenu", upper(strings.exitToMainMenu, code), 32, 224, true],
    ["done", upper(strings.done, code), 32, 264, true],
    // Settings rows: label beside a 96px switch in a 344px card, 28px
    ["soundEffects", strings.soundEffects, 28, 236, false],
    ["vibration", strings.vibration, 28, 236, false],
    ["appIcon", strings.appIcon, 28, 236, false],
    // Dialog titles wrap rather than clip, 40px in a 344px card
    ["settings (title)", upper(strings.settings, code), 40, 330, false],
    ["yourAnimal", upper(strings.yourAnimal, code), 40, 330, false],
    ["appIcon (title)", upper(strings.appIcon, code), 40, 330, false],
  ];
  const animals = Object.entries(strings.animals);
  const longest = animals.reduce((a, b) =>
    measure(b[1], 24, dimbo) > measure(a[1], 24, dimbo) ? b : a
  );
  slots.push([
    `wins (${longest[0]})`,
    upper(strings.wins.replace("{name}", longest[1]), code),
    40,
    330,
    false,
  ]);
  for (const [animal, name] of animals) {
    // Nameplate: 120 − paddingLeft 16 at 24px (the plate grows past it, so
    // this only warns); chooser labels sit under 72px tiles with 10px margins
    slots.push([`animals.${animal} (nameplate)`, name, 24, 104, false]);
    slots.push([`animals.${animal} (chooser)`, name, 20, 92, false]);
  }
  for (const [label, text, px, budget, hard] of slots) {
    const width = Math.round(measure(text, px, dimbo));
    if (width > budget) {
      const message = `${code}: ${label} "${text}" is ${width}px at ${px}px, slot is ${budget}px${
        dimbo ? "" : " (estimated)"
      }`;
      (hard ? fail : warn)(message);
    }
  }
}

// --- Store metadata ---------------------------------------------------------

const words = (text) =>
  text
    .toLowerCase()
    .split(/[\s,.!?:;()\-–—/]+/)
    .filter((w) => w.length > 2);

for (const [code, storeLocale] of Object.entries(STORE_LOCALES)) {
  const dir = path.join(root, "store/metadata", storeLocale);
  const exists = await stat(dir).then(
    (s) => s.isDirectory(),
    () => false
  );
  if (!exists) {
    fail(`${code}: no store metadata at store/metadata/${storeLocale}/`);
    continue;
  }
  const files = {};
  for (const file of Object.keys(STORE_LIMITS)) {
    try {
      files[file] = (await readFile(path.join(dir, file), "utf8")).trim();
    } catch {
      fail(`${storeLocale}: missing ${file}`);
    }
  }
  for (const [file, limit] of Object.entries(STORE_LIMITS)) {
    const text = files[file];
    if (text === undefined) {
      continue;
    }
    if (!text) {
      fail(`${storeLocale}: ${file} is empty`);
    }
    if ([...text].length > limit) {
      fail(
        `${storeLocale}: ${file} is ${[...text].length} chars, limit ${limit}`
      );
    }
  }
  const keywords = files["keywords.txt"];
  if (keywords) {
    if (/,\s|\s,/.test(keywords)) {
      fail(`${storeLocale}: keywords.txt has spaces around a comma`);
    }
    const taken = new Set([
      ...words(files["name.txt"] ?? ""),
      ...words(files["subtitle.txt"] ?? ""),
    ]);
    for (const keyword of keywords.split(",")) {
      if (taken.has(keyword.trim().toLowerCase())) {
        warn(
          `${storeLocale}: keyword "${keyword}" repeats the name or subtitle`
        );
      }
    }
  }
}
const extra = (
  await readdir(path.join(root, "store/metadata")).catch(() => [])
).filter(
  (d) => !Object.values(STORE_LOCALES).includes(d) && !d.startsWith(".")
);
for (const d of extra) {
  warn(`store/metadata/${d}/ has no app locale`);
}

// --- Report -----------------------------------------------------------------

for (const message of warnings) {
  console.log(`⚠ ${message}`);
}
for (const message of errors) {
  console.error(`✖ ${message}`);
}
console.log(
  `${Object.keys(locales).length} locales, ${enKeys.size} keys: ${
    errors.length
  } errors, ${warnings.length} warnings`
);
process.exit(errors.length ? 1 : 0);
