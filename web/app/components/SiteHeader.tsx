"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { SiteSearch } from "@/app/components/SiteSearch";
import { SiteFooter } from "@/app/components/SiteFooter";
import { EventAnnouncementBanner } from "@/app/components/EventAnnouncementBanner";
import { I18nProvider, useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";

type NavItem =
  | { type: "hash"; href: string; key: string }
  | { type: "route"; href: string; key: string; match?: string };

const NAV: NavItem[] = [
  { type: "route", href: "/", key: "nav.home", match: "/" },
  { type: "route", href: "/rooms", key: "nav.stay", match: "/rooms" },
  { type: "hash", href: "/#dine", key: "nav.dine" },
  { type: "hash", href: "/#conferences", key: "nav.conferences" },
  { type: "route", href: "/events", key: "nav.events", match: "/events" },
  { type: "hash", href: "/#gallery", key: "nav.gallery" },
  { type: "hash", href: "/#about", key: "nav.about" },
  { type: "hash", href: "/#contact", key: "nav.contact" },
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

    const desktopQuery = window.matchMedia("(min-width: 1101px)");
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

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  function isActive(item: NavItem) {
    if (item.type === "route") {
      const match = item.match ?? item.href;
      if (match === "/") return pathname === "/";
      return pathname === match || pathname.startsWith(`${match}/`);
    }
    return false;
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
        {NAV.map((item) => {
          const active = isActive(item);
          if (item.type === "route") {
            return (
              <Link
                key={`${item.key}-${item.href}`}
                href={item.href}
                className={active ? "is-active" : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {t(item.key)}
              </Link>
            );
          }
          return (
            <a
              key={`${item.key}-${item.href}`}
              href={item.href}
              onClick={(event) => {
                event.preventDefault();
                const hash = item.href.includes("#")
                  ? `#${item.href.split("#")[1]}`
                  : item.href;
                goHomeSection(hash);
              }}
            >
              {t(item.key)}
            </a>
          );
        })}
        <button
          type="button"
          className="nav-book-mobile"
          onClick={openBooking}
        >
          {t("nav.bookStay")}
        </button>
      </nav>

      <div className="header-actions">
        <SiteSearch />
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
  const pathname = usePathname() || "";
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  const onHome = pathname === "/";
  const onEvents = pathname.startsWith("/events");
  return (
    <I18nProvider key="public-i18n" initialLocale={initialLocale}>
      <EventAnnouncementBanner />
      <SiteHeader variant={onHome ? "hero" : "solid"} />
      <div
        className={[
          onHome ? undefined : "has-site-header",
          onEvents ? "events-chrome" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
      <SiteFooter />
      <Toaster position="top-center" richColors closeButton />
    </I18nProvider>
  );
}
