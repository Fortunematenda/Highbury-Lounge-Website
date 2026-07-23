"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SiteSearch } from "@/app/components/SiteSearch";
import { SiteFooter } from "@/app/components/SiteFooter";
import { LanguageSelector } from "@/lib/i18n/LanguageSelector";
import { I18nProvider, useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";

const NAV = [
  { href: "/#stay", key: "nav.stay" },
  { href: "/#meet", key: "nav.meet" },
  { href: "/#dine", key: "nav.dine" },
  { href: "/#gallery", key: "nav.gallery" },
  { href: "/#contact", key: "nav.contact" },
] as const;

const SEARCH_ROOMS = [
  {
    id: "deluxe-double",
    name: "Highbury Deluxe King",
    detail: "King bed · 2 guests · Breakfast included",
  },
  {
    id: "executive-twin",
    name: "Garden Executive Twin",
    detail: "2 double beds · 4 guests · Garden view",
  },
  {
    id: "classic-queen",
    name: "Classic Queen Retreat",
    detail: "Queen bed · 2 guests · Quiet garden wing",
  },
  {
    id: "signature-suite",
    name: "Highbury Signature Suite",
    detail: "King bed · Lounge area · Premium breakfast",
  },
  {
    id: "family-garden",
    name: "Garden Family Residence",
    detail: "2 double beds · 4 guests · Garden access",
  },
  {
    id: "business-studio",
    name: "Executive Business Studio",
    detail: "King bed · Work desk · High-speed Wi-Fi",
  },
];

type Props = {
  variant?: "hero" | "solid";
};

export function SiteHeader({ variant = "solid" }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation("common");
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerState, setHeaderState] = useState<"top" | "sticky">(
    variant === "solid" ? "sticky" : "top",
  );

  useEffect(() => {
    if (variant !== "hero") {
      setHeaderState("sticky");
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 981px)");
    const onScroll = () => {
      if (!desktopQuery.matches) {
        setHeaderState("top");
        return;
      }
      setHeaderState(window.scrollY < 24 ? "top" : "sticky");
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    desktopQuery.addEventListener("change", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      desktopQuery.removeEventListener("change", onScroll);
    };
  }, [variant]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function goHomeSection(hash: string) {
    setMenuOpen(false);
    if (pathname === "/") {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push(`/${hash}`);
  }

  function openBooking() {
    setMenuOpen(false);
    if (pathname === "/") {
      document
        .getElementById("booking-search")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    router.push("/#booking-search");
  }

  const isSolid = variant === "solid" || headerState === "sticky";

  return (
    <header
      className={[
        "site-header",
        isSolid ? "is-sticky" : "",
        variant === "solid" ? "is-solid" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        className="brand brand-with-logo"
        href="/"
        aria-label={t("brand.homeAria")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-logo"
          src="/images/highbury-lounge-logo-light.png?v=4"
          alt="Highbury Lounge"
        />
      </Link>

      <nav
        className={menuOpen ? "nav open" : "nav"}
        aria-label="Main navigation"
      >
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(event) => {
              event.preventDefault();
              const hash = item.href.slice(1);
              goHomeSection(hash);
            }}
          >
            {t(item.key)}
          </a>
        ))}
        <div className="nav-language-mobile">
          <LanguageSelector variant="compact" />
        </div>
      </nav>

      <div className="header-actions">
        <LanguageSelector variant="header" />
        <SiteSearch rooms={SEARCH_ROOMS} />
        <button
          type="button"
          className="menu-button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <button type="button" className="header-cta" onClick={openBooking}>
          {t("nav.bookStay")}
        </button>
      </div>
    </header>
  );
}

export function PublicChrome({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: AppLocale | null;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  const onHome = pathname === "/";
  return (
    <I18nProvider initialLocale={initialLocale}>
      <SiteHeader variant={onHome ? "hero" : "solid"} />
      <div className={onHome ? undefined : "has-site-header"}>{children}</div>
      <SiteFooter />
    </I18nProvider>
  );
}
