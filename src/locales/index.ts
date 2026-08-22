import de from "./de";
import en from "./en";
import es from "./es";
import esMX from "./es-MX";
import fr from "./fr";
import it from "./it";
import ja from "./ja";
import ko from "./ko";
import ptBR from "./pt-BR";
import zhHans from "./zh-Hans";
import type { Translations } from "./types";

// Pure data, so scripts/check-locales.mjs can load it outside the app
export const locales = {
  en,
  es,
  "es-MX": esMX,
  "pt-BR": ptBR,
  de,
  fr,
  it,
  ja,
  ko,
  "zh-Hans": zhHans,
} satisfies Record<string, Translations>;

export type LocaleCode = keyof typeof locales;

export const isLocaleCode = (tag: string): tag is LocaleCode =>
  Object.prototype.hasOwnProperty.call(locales, tag);

// A language with a single regional file serves the whole language
const languageDefaults: Partial<Record<string, LocaleCode>> = {
  pt: "pt-BR",
  zh: "zh-Hans",
};

// Spanish from the Americas reads the Mexican file; everything else the
// European one
const LATIN_AMERICA = new Set([
  "419",
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "US",
  "UY",
  "VE",
]);

// BCP 47 casing: language lowercase, script Titlecase, region UPPERCASE
const canonical = (tag: string) =>
  tag.split(/[-_]/).map((part, i) => {
    if (i === 0) {
      return part.toLowerCase();
    }
    if (part.length === 4) {
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    }
    return part.toUpperCase();
  });

// The first supported locale along the device's languages, most specific
// subtag run first: es-MX → es; zh-Hans-CN → zh-Hans → zh; pt-PT → pt → pt-BR
export const resolveLocale = (languageTags: string[]): LocaleCode => {
  for (const tag of languageTags) {
    const parts = canonical(tag);
    const language = parts[0];
    if (language === "es" && parts.some((part) => LATIN_AMERICA.has(part))) {
      return "es-MX";
    }
    for (let length = parts.length; length > 0; length--) {
      const candidate = parts.slice(0, length).join("-");
      if (isLocaleCode(candidate)) {
        return candidate;
      }
    }
    const fallback = languageDefaults[language];
    if (fallback) {
      return fallback;
    }
  }
  return "en";
};
