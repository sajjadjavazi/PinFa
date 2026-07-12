import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { OnboardingInterestsForm } from "@/components/OnboardingInterestsForm";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return {
    robots: {
      follow: false,
      index: false,
    },
    title: t(dictionary, "interests.chooseTitle"),
  };
}

export default async function OnboardingInterestsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [categories, interests] = await Promise.all([
    prisma.category.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.userInterest.findMany({
      where: {
        userId: user.id,
      },
      select: {
        categoryId: true,
      },
    }),
  ]);

  return (
    <>
    <AppHeader currentUser={user} locale={locale} />
    <main className="mx-auto grid min-h-screen w-full max-w-5xl content-start gap-8 px-4 py-8 sm:px-6">
      <section>
        <p className="text-sm font-medium uppercase text-neutral-500">
          PinFa
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          {t(dictionary, "interests.chooseTitle")}
        </h1>
      </section>

      {categories.length > 0 ? (
        <OnboardingInterestsForm
          categories={categories}
          initialSelectedIds={interests.map((interest) => interest.categoryId)}
          locale={locale}
        />
      ) : (
        <p className="text-sm text-neutral-600">
          {t(dictionary, "interests.emptyCategories")}
        </p>
      )}
    </main>
    </>
  );
}
