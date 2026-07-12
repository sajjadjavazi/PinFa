import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { PinUploadForm } from "@/components/PinUploadForm";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
import { prisma } from "@/lib/prisma";
import { getUploadLimits } from "@/lib/upload-settings";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return {
    robots: {
      follow: false,
      index: false,
    },
    title: t(dictionary, "upload.title"),
  };
}

export default async function UploadPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [categories, uploadLimits] = await Promise.all([
    prisma.category.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    getUploadLimits(),
  ]);

  return (
    <>
    <AppHeader currentUser={user} locale={locale} />
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-8 px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-4 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-neutral-500">PinFa</p>
          <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
            {t(dictionary, "upload.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            {t(dictionary, "upload.description")}
          </p>
        </div>
        <Link
          href="/profile"
          className="text-sm font-medium text-neutral-950 underline underline-offset-4"
        >
          {t(dictionary, "nav.profile")}
        </Link>
      </section>

      <PinUploadForm
        categories={categories}
        maxImageSizeMb={uploadLimits.maxImageSizeMb}
        allowedMimeTypes={uploadLimits.allowedMimeTypes}
        locale={locale}
      />
    </main>
    </>
  );
}
