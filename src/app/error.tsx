"use client";

import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dictionary = getDictionary(getBrowserLocale());

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-6 py-10">
      <section className="grid gap-4 rounded-md border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">
          {t(dictionary, "global.errorEyebrow")}
        </p>
        <h1 className="text-2xl font-semibold text-neutral-950">
          {t(dictionary, "global.errorTitle")}
        </h1>
        <p className="text-sm leading-6 text-neutral-600">
          {t(dictionary, "global.errorDescription")}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mx-auto h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          {t(dictionary, "global.tryAgain")}
        </button>
      </section>
    </main>
  );
}

function getBrowserLocale() {
  if (typeof document === "undefined") {
    return parseLocale(null);
  }

  const localeCookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`));

  return parseLocale(localeCookie?.split("=")[1]);
}
