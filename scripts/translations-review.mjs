// Writes store/translations-review.md: every string of every language beside
// its English source, so a native speaker can review a language in one pass.
//
//   bun scripts/translations-review.mjs
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { locales } from "../src/locales/index.ts";

const root = path.resolve(import.meta.dirname, "..");

// Choices worth a reviewer's attention, per language
const NOTES = {
  es: [
    "Spain's words where iOS itself differs by region: «Ajustes», «Hecho», «icono».",
    "The on/off switch is 40 px wide, so «Sí»/«No» stand in for ON/OFF.",
    "«Cerdo» over regional «cochino»/«chancho» — understood everywhere.",
  ],
  "es-MX": [
    "Only the words that differ from Spain: «Configuración», «Listo», «ícono» (as iOS uses them in Latin America).",
    "Chosen for every Spanish-speaking region of the Americas (and es-419), not only Mexico.",
  ],
  "pt-BR": [
    "«bicho» rather than «animal» where the app talks to children («Seu bicho») — warmer, and the usual nursery word.",
    "«Cachorro» over «Cão»; «Coala» in the Portuguese spelling; «Sim»/«Não» on the switch.",
  ],
  de: [
    "Mode toggle segments are 150 px, so «Leicht»/«Klassisch» rather than «Einfacher Modus».",
    "«Schmetterling» kept over «Falter» (it is the children's word); the nameplate widens for it and the victory title wraps onto two lines. «Wildschwein» and «Schildkröte» also widen the plate.",
    "«An»/«Aus» on the switch; «Fertig» for Done; «App-Symbol» is Apple's term.",
  ],
  fr: [
    "«Pingouin» instead of the zoologically correct «Manchot» — it is what children (and most adults) say.",
    "«Chauve-souris» widens the nameplate and wraps the victory title; «Grenouille» fits.",
    "«OK» for Done and «Réglages» for Settings, as on iOS; «Oui»/«Non» on the switch; French spacing before «?» and «!».",
  ],
  it: [
    "«Mucca» over «Vacca»; «Sì»/«No» on the switch; «Fatto» for Done; «Impostazioni» as on iOS.",
  ],
  ja: [
    "Platform font: Dimbo has no kana or kanji.",
    "Animal names in katakana, as in picture books. Strings aimed at children stay in kana («なんにんであそぶ？», «きみのどうぶつ», «〜のかち！»); settings use the kanji iOS uses (設定, 音楽, 効果音, 完了).",
    "«メニューへ» is deliberately short — the measured «メニューにもどる» overflows the 224 px button.",
    "ハムスター / ハリネズミ / チョウチョ widen the nameplate; their chooser labels shrink slightly to fit.",
  ],
  ko: [
    "Platform font. Polite-casual -요 endings, suited to parents reading with children.",
    "«강아지» (puppy) over «개», as in children's media; «생쥐» for Mouse, «부엉이» for Owl; «켬»/«끔» are iOS's own switch words.",
  ],
  "zh-Hans": [
    "Platform font. «母鸡» for Chicken (the card shows a hen) next to «小鸡» for Chick; «考拉»; «开»/«关»; «跳过» for Pass.",
  ],
};

const flatten = (object, prefix = "") =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]]
  );

const codes = Object.keys(locales);
const rows = flatten(locales.en).filter(([key]) => key !== "font");
const cell = (text) => String(text).replace(/\|/g, "\\|");

const lines = [
  "# Translations review",
  "",
  "Every string in the app beside its English source, generated from `src/locales/` by `bun scripts/translations-review.mjs`. The translations are AI-written and pending review by native speakers: please read one column top to bottom, and fix the locale file rather than this table.",
  "",
  "Titles and buttons are shown in CAPITALS in the app (applied at render with the locale's casing rules); `{name}`, `{animal}` and `{n}` are filled in at runtime. Animal names double as the players' names on the nameplates, so the shortest everyday word a kindergarten teacher would use is preferred. Keys starting with `a11y` are read by VoiceOver only.",
  "",
  `| key | ${codes.join(" | ")} |`,
  `|---|${codes.map(() => "---").join("|")}|`,
  ...rows.map(([key]) => {
    const values = codes.map((code) => {
      const value = flatten(locales[code]).find(([k]) => k === key)?.[1];
      return cell(value ?? "");
    });
    return `| \`${key}\` | ${values.join(" | ")} |`;
  }),
  "",
  "## Notes on choices",
  "",
  ...Object.entries(NOTES).flatMap(([code, notes]) => [
    `### ${code}`,
    "",
    ...notes.map((note) => `- ${note}`),
    "",
  ]),
  "## Store listing",
  "",
  "`store/metadata/<locale>/` holds each storefront's name, subtitle, keywords, promotional text, description and release notes. Keywords were written for how parents search in each market (for example «sin anuncios», «ohne Werbung», «sans pub», «広告なし», «광고없음», «无广告») rather than translated word for word, and avoid repeating words already in the name or subtitle. `bun run check:locales` enforces App Store Connect's character limits.",
  "",
];

await writeFile(
  path.join(root, "store/translations-review.md"),
  lines.join("\n")
);
console.log(
  `store/translations-review.md: ${rows.length} keys × ${codes.length} locales`
);
