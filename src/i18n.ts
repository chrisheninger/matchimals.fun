import { getLocales } from "expo-localization";
import type { TextStyle } from "react-native";

import type { AnimalName } from "./Animals";
import { locales, resolveLocale } from "./locales";
import type { StringKey, Translations } from "./locales/types";

// Resolved once at startup: the app follows the device language (iOS
// relaunches it when that changes) and has no language picker of its own
export const locale = resolveLocale(
  getLocales().map(({ languageTag }) => languageTag)
);

const strings: Translations = locales[locale];

// The display typeface for the running locale, spread into text styles in
// place of naming Dimbo: scripts Dimbo can't draw get the platform font, at a
// weight that matches Dimbo's heft
export const displayFont: Pick<TextStyle, "fontFamily" | "fontWeight"> =
  strings.font === "Dimbo" ? { fontFamily: "Dimbo" } : { fontWeight: "700" };

type Params = Record<string, string | number>;

const fill = (template: string, params?: Params) =>
  params
    ? template.replace(/\{(\w+)\}/g, (match, key: string) =>
        Object.prototype.hasOwnProperty.call(params, key)
          ? String(params[key])
          : match
      )
    : template;

export const t = (key: StringKey, params?: Params) =>
  fill(strings[key], params);

// Titles and buttons are set in caps at render, with the locale's casing rules
export const caps = (text: string) => text.toLocaleUpperCase(locale);

export const playersLabel = (n: number) =>
  fill(n === 1 ? strings.players.one : strings.players.other, { n });

export const animalName = (animal: AnimalName) => strings.animals[animal];
