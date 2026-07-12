import Link from "next/link";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";

export default async function NotFound() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-6 py-10">
      <section className="grid gap-4 rounded-md border border-neutral-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-neutral-500">404</p>
        <h1 className="text-2xl font-semibold text-neutral-950">
          {t(dictionary, "global.notFoundTitle")}
        </h1>
        <p className="text-sm leading-6 text-neutral-600">
          {t(dictionary, "global.notFoundDescription")}
        </p>
        <Link
          href="/"
          className="mx-auto grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          {t(dictionary, "global.backToFeed")}
        </Link>
      </section>
    </main>
  );
}
