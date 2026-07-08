import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "PinFa",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    title: "PinFa",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  keywords: [
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
  description:
    "A Persian visual discovery platform for Pins, Boards, and creative inspiration.",
  openGraph: {
    description:
      "Discover, save, and organize visual inspiration on PinFa.",
    images: [
      {
        alt: "PinFa",
        url: "/brand/PinFa-logo.webp",
      },
    ],
    locale: "fa_IR",
    siteName: "PinFa",
    title: "PinFa",
    type: "website",
  },
  twitter: {
    card: "summary",
    description:
      "Discover, save, and organize visual inspiration on PinFa.",
    images: ["/brand/PinFa-logo.webp"],
    title: "PinFa",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa">
      <body>{children}</body>
    </html>
  );
}
