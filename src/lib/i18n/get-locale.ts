import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  localeDirections,
  parseLocale,
  type Locale,
} from "@/lib/i18n/config";

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export function getDirection(locale: Locale) {
  return localeDirections[locale] ?? localeDirections[DEFAULT_LOCALE];
}

