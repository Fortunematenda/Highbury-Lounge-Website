import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
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

function resolvePathname(headerStore: Headers) {
  const candidates = [
    headerStore.get("x-matched-path"),
    headerStore.get("x-invoke-path"),
    headerStore.get("x-pathname"),
    headerStore.get("next-url"),
    headerStore.get("x-url"),
    headerStore.get("x-forwarded-uri"),
    headerStore.get("x-original-url"),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      if (raw.startsWith("http")) return new URL(raw).pathname;
      if (raw.startsWith("/")) return raw.split("?")[0];
    } catch {
      /* ignore */
    }
  }
  return "";
}

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
  const pathname = resolvePathname(await headers());
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang={initialLocale ?? "en"}>
      <body className="antialiased">
        {isAdmin ? (
          children
        ) : (
          <PublicChrome initialLocale={initialLocale}>{children}</PublicChrome>
        )}
      </body>
    </html>
  );
}
