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
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/images/highbury-lounge-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
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
