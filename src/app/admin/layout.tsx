import Link from "next/link";
import type { Metadata } from "next";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { requireAdminPageUser } from "@/lib/admin";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return {
    robots: {
      follow: false,
      index: false,
    },
    title: t(dictionary, "nav.admin"),
  };
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminUser = await requireAdminPageUser();
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/admin/moderation" className="text-xl font-semibold">
              {t(dictionary, "admin.layout.adminHome")}
            </Link>
            <p className="mt-1 text-sm text-neutral-500">
              {adminUser.displayName} - {adminUser.role}
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-medium">
            <Link
              href="/admin/moderation"
              className="rounded-md bg-neutral-950 px-4 py-2 text-white transition hover:bg-neutral-800"
            >
              {t(dictionary, "admin.layout.moderation")}
            </Link>
            <Link
              href="/admin/reports"
              className="rounded-md border border-neutral-300 px-4 py-2 text-neutral-800 transition hover:border-neutral-950"
            >
              {t(dictionary, "admin.layout.reports")}
            </Link>
            <Link
              href="/profile"
              className="rounded-md border border-neutral-300 px-4 py-2 text-neutral-800 transition hover:border-neutral-950"
            >
              {t(dictionary, "admin.layout.profile")}
            </Link>
            <LanguageToggle locale={locale} />
            <AdminLogoutButton locale={locale} />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
