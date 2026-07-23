import type { Metadata } from "next";
import { PublicChrome } from "@/app/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Highbury Lounge · Kadoma",
  description:
    "Comfortable rooms, conference spaces and memorable celebrations at Highbury Lounge in Kadoma, Zimbabwe.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PublicChrome>{children}</PublicChrome>
      </body>
    </html>
  );
}
