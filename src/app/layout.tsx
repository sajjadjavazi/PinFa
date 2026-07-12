import type { Metadata } from "next";
import "./globals.css";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getCurrentLocale, getDirection } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale().catch(() => DEFAULT_LOCALE);
  const dictionary = getDictionary(locale);
  const description = t(dictionary, "meta.rootDescription");
  const ogDescription = t(dictionary, "meta.rootOgDescription");

  return {
    applicationName: "PinFa",
    alternates: {
      canonical: "/",
    },
    appleWebApp: {
      capable: true,
      title: "PinFa",
    },
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ),
    keywords:
      locale === "fa"
        ? [
            "PinFa",
            "پینفا",
            "کشف بصری",
            "بورد",
            "پین",
            "الهام فارسی",
          ]
        : [
            "PinFa",
            "visual discovery",
            "mood boards",
            "Pins",
            "Boards",
            "Persian inspiration",
          ],
    title: {
      default: "PinFa",
      template: "%s | PinFa",
    },
    description,
    openGraph: {
      description: ogDescription,
      images: [
        {
          alt: "PinFa",
          url: "/brand/PinFa-logo.webp",
        },
      ],
      locale: locale === "fa" ? "fa_IR" : "en_US",
      siteName: "PinFa",
      title: "PinFa",
      type: "website",
    },
    twitter: {
      card: "summary",
      description: ogDescription,
      images: ["/brand/PinFa-logo.webp"],
      title: "PinFa",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale().catch(() => DEFAULT_LOCALE);

  return (
    <html lang={locale} dir={getDirection(locale)}>
      <body>{children}</body>
    </html>
  );
}
