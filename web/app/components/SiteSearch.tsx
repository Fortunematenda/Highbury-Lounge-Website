"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type SearchHit = {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: "Page" | "Room" | "Menu" | "Venue";
};

const SITE_PAGES: SearchHit[] = [
  {
    id: "page-home",
    title: "Home",
    description: "Welcome to Highbury Lounge in Kadoma",
    href: "/#home",
    kind: "Page",
  },
  {
    id: "page-stay",
    title: "Stay",
    description: "Guest rooms and accommodation",
    href: "/#stay",
    kind: "Page",
  },
  {
    id: "page-meet",
    title: "Meet & celebrate",
    description: "Conferences, events and celebrations",
    href: "/#meet",
    kind: "Page",
  },
  {
    id: "page-dine",
    title: "Dine",
    description: "Restaurant and kitchen dining",
    href: "/#dine",
    kind: "Page",
  },
  {
    id: "page-menu",
    title: "Kitchen menu",
    description: "Explore food and drinks from our kitchen",
    href: "/#dine-menu",
    kind: "Page",
  },
  {
    id: "page-gallery",
    title: "Gallery",
    description: "Photos of Highbury Lounge",
    href: "/#gallery",
    kind: "Page",
  },
  {
    id: "page-contact",
    title: "Contact",
    description: "Address, phone and WhatsApp",
    href: "/#contact",
    kind: "Page",
  },
  {
    id: "page-conference",
    title: "Conference enquiry",
    description: "Request a conference or event quote",
    href: "/conference",
    kind: "Page",
  },
  {
    id: "page-book",
    title: "Book a room",
    description: "Check availability and reserve your stay",
    href: "/#home",
    kind: "Page",
  },
];

type Props = {
  rooms?: Array<{ id: string; name: string; detail: string }>;
};

function matches(query: string, ...parts: Array<string | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return parts.some((part) => (part || "").toLowerCase().includes(q));
}

export function SiteSearch({ rooms = [] }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [menuHits, setMenuHits] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const allowCloseRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      allowCloseRef.current = false;
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    allowCloseRef.current = false;

    // Ignore the click/tap that opened the modal so it cannot close instantly.
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
          for (const item of category.items ?? []) {
            hits.push({
              id: `menu-${item.id}`,
              title: item.name,
              description:
                item.shortDescription ||
                item.description ||
                category.name ||
                "Menu item",
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
  }, [open]);

  const roomHits: SearchHit[] = useMemo(
    () =>
      rooms.map((room) => ({
        id: `room-${room.id}`,
        title: room.name,
        description: room.detail,
        href: "/#stay",
        kind: "Room" as const,
      })),
    [rooms],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as SearchHit[];
    const pool = [...SITE_PAGES, ...roomHits, ...menuHits];
    return pool
      .filter((hit) => matches(q, hit.title, hit.description, hit.kind))
      .slice(0, 12);
  }, [query, roomHits, menuHits]);

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
              aria-label="Search Highbury Lounge"
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
                    // Keep typing inside the modal; Esc still closes via window listener.
                    event.stopPropagation();
                  }}
                  placeholder="Search rooms, menu, pages…"
                  aria-label="Search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="site-search-close"
                  onClick={closeSearch}
                  aria-label="Close search"
                >
                  ×
                </button>
              </div>

              <div className="site-search-results">
                {!query.trim() ? (
                  <p className="site-search-hint">
                    Try “breakfast”, “suite”, “conference”, or “gallery”.
                  </p>
                ) : results.length === 0 ? (
                  <p className="site-search-hint">
                    No matches for “{query.trim()}”.
                  </p>
                ) : (
                  <ul>
                    {results.map((hit) => (
                      <li key={hit.id}>
                        <button type="button" onClick={() => goTo(hit.href)}>
                          <span className="site-search-kind">{hit.kind}</span>
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
        className="header-search-btn"
        aria-label="Search the website"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openSearch}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
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
