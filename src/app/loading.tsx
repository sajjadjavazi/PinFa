import { LoadingState } from "@/components/ui/LoadingState";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";

export default async function Loading() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
      <LoadingState label={t(dictionary, "global.loadingPinfa")} />
    </main>
  );
}
