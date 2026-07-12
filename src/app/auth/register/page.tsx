import type { Metadata } from "next";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
import { RegisterForm } from "./RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const title = t(dictionary, "meta.registerTitle");
  const description = t(dictionary, "auth.registerDescription");

  return {
    alternates: {
      canonical: "/auth/register",
    },
    description,
    openGraph: {
      description,
      title: `${title} | PinFa`,
      type: "website",
      url: "/auth/register",
    },
    title,
  };
}

export default async function RegisterPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md content-center px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase text-neutral-500">
          PinFa
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-neutral-950">
          {t(dictionary, "auth.createAccountTitle")}
        </h1>
      </div>
      <RegisterForm locale={locale} />
    </main>
  );
}
