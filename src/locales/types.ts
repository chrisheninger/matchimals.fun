import type { AnimalName } from "../Animals";

// Every user-facing string in the app. English (en.ts) is the source of truth;
// each locale implements this interface, so a missing or misspelled key is a
// type error. Strings are stored in natural case — titles and buttons are set
// in caps at render with the locale's casing rules — and `{name}`-style
// placeholders are filled by t().
export interface Translations {
  // Dimbo only has Latin glyphs; scripts it can't draw use the platform font
  font: "Dimbo" | "system";

  howManyPlayers: string;
  easyMode: string;
  classic: string;
  easyCaption: string;
  classicCaption: string;

  settings: string;
  music: string;
  soundEffects: string;
  vibration: string;
  appIcon: string;
  yourAnimal: string;
  done: string;
  on: string;
  off: string;

  scrollToCenter: string;
  exitToMainMenu: string;
  wins: string;
  share: string;
  // The line that travels with a shared victory picture
  shareMessage: string;
  // The picture's footer, after the site's address
  shareFooter: string;

  pass: string;
  menu: string;
  exit: string;
  center: string;

  a11ySoundEffects: string;
  a11yAppIcon: string;
  a11yChooseAppIcon: string;
  a11yUseAppIcon: string;
  a11yPlayAs: string;

  // n is only ever 1–4, so one/other covers every language here
  players: { one: string; other: string };
  animals: Record<AnimalName, string>;
}

// The keys t() accepts: every plain string above
export type StringKey = Exclude<
  {
    [K in keyof Translations]: Translations[K] extends string ? K : never;
  }[keyof Translations],
  "font"
>;
