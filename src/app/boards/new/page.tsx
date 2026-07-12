import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CreateBoardForm } from "@/components/boards/CreateBoardForm";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";

export default async function NewBoardPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <>
      <AppHeader currentUser={user} locale={locale} />
      <main className="mx-auto grid min-h-screen w-full max-w-2xl content-start gap-8 px-6 py-10">
        <section>
          <p className="text-sm font-medium text-neutral-500">
            {t(dictionary, "board.boards")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
            {t(dictionary, "board.create")}
          </h1>
          <p className="mt-3 leading-7 text-neutral-600">
            {t(dictionary, "board.createDescription")}
          </p>
        </section>

        <CreateBoardForm locale={locale} />
      </main>
    </>
  );
}
