import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "PinFa",
    template: "%s | PinFa",
  },
  description:
    "A Persian visual discovery platform for Pins, Boards, and creative inspiration.",
  openGraph: {
    description:
      "Discover, save, and organize visual inspiration on PinFa.",
    siteName: "PinFa",
    title: "PinFa",
    type: "website",
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
