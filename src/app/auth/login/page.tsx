import type { Metadata } from "next";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const title = t(dictionary, "meta.loginTitle");
  const description = t(dictionary, "auth.loginDescription");

  return {
    alternates: {
      canonical: "/auth/login",
    },
    description,
    openGraph: {
      description,
      title: `${title} | PinFa`,
      type: "website",
      url: "/auth/login",
    },
    title,
  };
}

export default async function LoginPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md content-center px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase text-neutral-500">
          PinFa
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          {t(dictionary, "auth.loginTitle")}
        </h1>
      </div>
      <LoginForm locale={locale} />
    </main>
  );
}
