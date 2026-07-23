import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PublicChrome } from "@/app/components/SiteHeader";
import { isAppLocale, type AppLocale } from "@/lib/i18n/locales";
import "./globals.css";

export const metadata: Metadata = {
  title: "Highbury Lounge · Kadoma",
  description:
    "Comfortable rooms, conference spaces and memorable celebrations at Highbury Lounge in Kadoma, Zimbabwe.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/images/highbury-lounge-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const cookieLocale = jar.get("hl_locale")?.value;
  const initialLocale: AppLocale | null = isAppLocale(cookieLocale)
    ? cookieLocale
    : null;

  return (
    <html lang={initialLocale ?? "en"}>
      <body className="antialiased">
        <PublicChrome initialLocale={initialLocale}>{children}</PublicChrome>
      </body>
    </html>
  );
}
