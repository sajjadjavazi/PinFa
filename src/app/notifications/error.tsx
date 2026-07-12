"use client";

import { LOCALE_COOKIE_NAME, parseLocale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

export default function NotificationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dictionary = getDictionary(getBrowserLocale());

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-4xl place-items-center px-6 py-10">
      <div className="rounded-md bg-white px-5 py-8 text-center shadow-sm ring-1 ring-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-950">
          {t(dictionary, "notifications.pageErrorTitle")}
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          {t(dictionary, "notifications.pageErrorDescription")}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          {t(dictionary, "common.retry")}
        </button>
      </div>
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
