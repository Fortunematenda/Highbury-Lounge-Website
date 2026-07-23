"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { pickTranslated } from "@/lib/i18n/content";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/locales";

type SearchKind = "Page" | "Room" | "Menu" | "Venue";

type SearchHit = {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: SearchKind;
};

const SITE_PAGE_DEFS = [
  {
    id: "page-home",
    titleKey: "search.pages.homeTitle",
    descKey: "search.pages.homeDesc",
    href: "/#home",
    kind: "Page" as const,
  },
  {
    id: "page-stay",
    titleKey: "search.pages.stayTitle",
    descKey: "search.pages.stayDesc",
    href: "/#stay",
    kind: "Page" as const,
  },
  {
    id: "page-meet",
    titleKey: "search.pages.meetTitle",
    descKey: "search.pages.meetDesc",
    href: "/#meet",
    kind: "Page" as const,
  },
  {
    id: "page-dine",
    titleKey: "search.pages.dineTitle",
    descKey: "search.pages.dineDesc",
    href: "/#dine",
    kind: "Page" as const,
  },
  {
    id: "page-menu",
    titleKey: "search.pages.menuTitle",
    descKey: "search.pages.menuDesc",
    href: "/#dine-menu",
    kind: "Page" as const,
  },
  {
    id: "page-gallery",
    titleKey: "search.pages.galleryTitle",
    descKey: "search.pages.galleryDesc",
    href: "/#gallery",
    kind: "Page" as const,
  },
  {
    id: "page-contact",
    titleKey: "search.pages.contactTitle",
    descKey: "search.pages.contactDesc",
    href: "/#contact",
    kind: "Page" as const,
  },
  {
    id: "page-conference",
    titleKey: "search.pages.conferenceTitle",
    descKey: "search.pages.conferenceDesc",
    href: "/conference",
    kind: "Page" as const,
  },
  {
    id: "page-book",
    titleKey: "search.pages.bookTitle",
    descKey: "search.pages.bookDesc",
    href: "/#home",
    kind: "Page" as const,
  },
];

type Props = {
  rooms?: Array<{
    id: string;
    name: string;
    detail: string;
    translationsJson?: string | null;
  }>;
};

function matches(query: string, ...parts: Array<string | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return parts.some((part) => (part || "").toLowerCase().includes(q));
}

export function SiteSearch({ rooms = [] }: Props) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as AppLocale;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [menuHits, setMenuHits] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const allowCloseRef = useRef(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open) {
      allowCloseRef.current = false;
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    allowCloseRef.current = false;

    const enableCloseTimer = window.setTimeout(() => {
      allowCloseRef.current = true;
      inputRef.current?.focus();
    }, 280);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!allowCloseRef.current) return;
      const panel = panelRef.current;
      if (!panel) return;
      if (event.target instanceof Node && !panel.contains(event.target)) {
        closeSearch();
      }
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(enableCloseTimer);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const hits: SearchHit[] = [];
        for (const category of data.categories ?? []) {
          const cat = pickTranslated(
            locale,
            { name: category.name, description: category.description },
            category.translationsJson,
          );
          for (const item of category.items ?? []) {
            const localized = pickTranslated(
              locale,
              {
                name: item.name,
                description: item.description,
                shortDescription: item.shortDescription,
              },
              item.translationsJson,
            );
            hits.push({
              id: `menu-${item.id}`,
              title: localized.name,
              description:
                localized.shortDescription ||
                localized.description ||
                cat.name ||
                t("search.menuItem"),
              href: "/#dine-menu",
              kind: "Menu",
            });
          }
        }
        setMenuHits(hits);
      })
      .catch(() => {
        if (!cancelled) setMenuHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, locale, t]);

  const kindLabel = (kind: SearchKind) => {
    if (kind === "Page") return t("search.kindPage");
    if (kind === "Room") return t("search.kindRoom");
    if (kind === "Menu") return t("search.kindMenu");
    return t("search.kindVenue");
  };

  const sitePages: SearchHit[] = useMemo(
    () =>
      SITE_PAGE_DEFS.map((page) => ({
        id: page.id,
        title: t(page.titleKey),
        description: t(page.descKey),
        href: page.href,
        kind: page.kind,
      })),
    [t],
  );

  const roomHits: SearchHit[] = useMemo(
    () =>
      rooms.map((room) => {
        const localized = pickTranslated(
          locale,
          { name: room.name, description: room.detail },
          room.translationsJson,
        );
        return {
          id: `room-${room.id}`,
          title: localized.name,
          description: localized.description || room.detail,
          href: "/#stay",
          kind: "Room" as const,
        };
      }),
    [rooms, locale],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as SearchHit[];
    const pool = [...sitePages, ...roomHits, ...menuHits];
    return pool
      .filter((hit) =>
        matches(q, hit.title, hit.description, kindLabel(hit.kind), hit.kind),
      )
      .slice(0, 12);
  }, [query, roomHits, menuHits, sitePages, t]);

  function closeSearch() {
    setOpen(false);
    setQuery("");
    document.body.style.overflow = "";
  }

  function openSearch(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    allowCloseRef.current = false;
    setOpen(true);
  }

  function goTo(href: string) {
    closeSearch();
    if (href.startsWith("/#")) {
      const hash = href.slice(1);
      if (window.location.pathname === "/") {
        window.setTimeout(() => {
          document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
        }, 50);
        return;
      }
      router.push(href);
      return;
    }
    router.push(href);
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="site-search-backdrop" role="presentation">
            <div
              ref={panelRef}
              className="site-search-panel"
              role="dialog"
              aria-modal="true"
              aria-label={t("search.dialogLabel")}
            >
              <div className="site-search-bar">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M20 20l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                  }}
                  placeholder={t("search.placeholder")}
                  aria-label={t("search.open")}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="site-search-close"
                  onClick={closeSearch}
                  aria-label={t("search.close")}
                >
                  ×
                </button>
              </div>

              <div className="site-search-results">
                {!query.trim() ? (
                  <p className="site-search-hint">{t("search.hint")}</p>
                ) : results.length === 0 ? (
                  <p className="site-search-hint">
                    {t("search.noMatches", { query: query.trim() })}
                  </p>
                ) : (
                  <ul>
                    {results.map((hit) => (
                      <li key={hit.id}>
                        <button type="button" onClick={() => goTo(hit.href)}>
                          <span className="site-search-kind">
                            {kindLabel(hit.kind)}
                          </span>
                          <strong>{hit.title}</strong>
                          <small>{hit.description}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="site-search-trigger"
        onClick={openSearch}
        aria-label={t("search.open")}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M20 20l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {modal}
    </>
  );
}
