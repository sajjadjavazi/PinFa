import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";
import { fa } from "@/lib/i18n/dictionaries/fa";

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fa,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function t(
  dictionary: Dictionary,
  key: string,
  values?: Record<string, string | number | null | undefined>,
) {
  const value = getByPath(dictionary, key);
  const template = typeof value === "string" ? value : key;

  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const replacement = values[name];
    return replacement === null || replacement === undefined
      ? ""
      : String(replacement);
  });
}

function getByPath(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, source);
}

export type { Dictionary };

