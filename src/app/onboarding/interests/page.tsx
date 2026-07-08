import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { OnboardingInterestsForm } from "@/components/OnboardingInterestsForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Choose Interests",
};

export default async function OnboardingInterestsPage() {
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
    <AppHeader currentUser={user} />
    <main className="mx-auto grid min-h-screen w-full max-w-5xl content-start gap-8 px-4 py-8 sm:px-6">
      <section>
        <p className="text-sm font-medium uppercase text-neutral-500">
          PinFa
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          Choose your interests
        </h1>
      </section>

      {categories.length > 0 ? (
        <OnboardingInterestsForm
          categories={categories}
          initialSelectedIds={interests.map((interest) => interest.categoryId)}
        />
      ) : (
        <p className="text-sm text-neutral-600">No active categories found.</p>
      )}
    </main>
    </>
  );
}
