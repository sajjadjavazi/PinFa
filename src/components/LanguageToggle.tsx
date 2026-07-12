"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  localeLabels,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type LanguageToggleProps = {
  locale: Locale;
};

export function LanguageToggle({ locale }: LanguageToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dictionary = getDictionary(locale);

  function setLocale(nextLocale: Locale) {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    router.refresh();
  }

  return (
    <div
      aria-label={t(dictionary, "nav.languageToggle")}
      className="flex h-9 items-center rounded-full border border-neutral-200 bg-white p-0.5 text-xs font-semibold"
      role="group"
    >
      {(["fa", "en"] as const).map((itemLocale) => (
        <button
          key={itemLocale}
          type="button"
          onClick={() => setLocale(itemLocale)}
          aria-pressed={locale === itemLocale}
          className={
            locale === itemLocale
              ? "h-7 rounded-full bg-neutral-950 px-2.5 text-white"
              : "h-7 rounded-full px-2.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
          }
        >
          {localeLabels[itemLocale]}
        </button>
      ))}
    </div>
  );
}

