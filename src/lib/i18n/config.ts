export const DEFAULT_LOCALE = "fa" as const;
export const LOCALE_COOKIE_NAME = "pinfa_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const SUPPORTED_LOCALES = ["fa", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TextDirection = "rtl" | "ltr";

export const localeDirections: Record<Locale, TextDirection> = {
  en: "ltr",
  fa: "rtl",
};

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  fa: "FA",
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function parseLocale(value: unknown): Locale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

