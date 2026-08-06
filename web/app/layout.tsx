import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Playfair_Display } from "next/font/google";
import { cookies, headers } from "next/headers";
import { PublicChrome } from "@/app/components/SiteHeader";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/locales";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
  const initialLocale: AppLocale | null = parseAppLocale(
    jar.get("hl_locale")?.value,
  );
  const pathname = resolvePathname(await headers());
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang={initialLocale ?? "en"} className={`${inter.variable} ${playfair.variable}`}>
      <Script
        src="/crypto-polyfill.js"
        strategy="beforeInteractive"
      />
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
