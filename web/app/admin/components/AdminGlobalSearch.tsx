"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Loader2, Search, X } from "lucide-react";

type SearchHit = {
  id: string;
  title: string;
  description: string;
  href: string;
  group: string;
};

export function AdminGlobalSearch({
  variant = "button",
}: {
  /** button = compact trigger (desktop). inline = always-visible field (mobile row). */
  variant?: "button" | "inline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();
  const isInline = variant === "inline";
  const panelOpen = isInline ? query.trim().length >= 2 || loading || !!error : open;

  useEffect(() => {
    if (isInline) return;
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (
        (event.key === "/" ||
          (event.key === "k" && (event.metaKey || event.ctrlKey))) &&
        !typing
      ) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isInline]);

  useEffect(() => {
    if (!open || isInline) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open, isInline]);

  useEffect(() => {
    const shouldSearch = isInline || open;
    if (!shouldSearch) return;
    const q = query.trim();
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (q.length < 2) {
        if (!cancelled) {
          setResults([]);
          setActiveIndex(-1);
          setLoading(false);
          setError("");
        }
        return;
      }
      setLoading(true);
      setError("");
      void fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Search failed");
          if (!cancelled) {
            setResults(data.results ?? []);
            setActiveIndex(-1);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Search failed");
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, q.length < 2 ? 0 : 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, isInline]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("hl-admin-recent-searches");
      setRecent(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setRecent([]);
    }
  }, [open, panelOpen]);

  const searchable = query.trim().length >= 2;
  const flatHits = useMemo(() => results, [results]);
  const grouped = useMemo(() => {
    if (!searchable) return [] as Array<[string, SearchHit[]]>;
    const map = new Map<string, SearchHit[]>();
    for (const hit of results) {
      const list = map.get(hit.group) ?? [];
      list.push(hit);
      map.set(hit.group, list);
    }
    return [...map.entries()];
  }, [results, searchable]);

  function go(href: string) {
    try {
      const raw = window.localStorage.getItem("hl-admin-recent-searches");
      const prev = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [query.trim(), ...prev.filter((q) => q !== query.trim())]
        .filter(Boolean)
        .slice(0, 6);
      window.localStorage.setItem(
        "hl-admin-recent-searches",
        JSON.stringify(next),
      );
    } catch {
      /* ignore */
    }
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    router.push(href);
  }

  function clearQuery() {
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!flatHits.length) return;
      setActiveIndex((i) => (i + 1) % flatHits.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!flatHits.length) return;
      setActiveIndex((i) => (i <= 0 ? flatHits.length - 1 : i - 1));
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0 && flatHits[activeIndex]) {
      event.preventDefault();
      go(flatHits[activeIndex].href);
      return;
    }
    if (event.key === "Escape") {
      if (isInline) clearQuery();
      else setOpen(false);
    }
  }

  const resultsPanel = panelOpen ? (
    <div
      className={`admin-search-results-panel${isInline ? " is-inline" : ""}`}
      role="listbox"
      aria-label="Search results"
    >
      {loading ? (
        <p className="admin-search-state">
          <Loader2 size={16} className="spin" aria-hidden /> Searching…
        </p>
      ) : null}
      {error ? <p className="admin-search-state error">{error}</p> : null}
      {!loading && !error && !searchable ? (
        recent.length ? (
          <div className="admin-search-group">
            <h3>Recent</h3>
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                className="admin-search-hit"
                onClick={() => setQuery(item)}
              >
                <strong>{item}</strong>
                <span>Recent search</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="admin-search-state">Type at least 2 characters</p>
        )
      ) : null}
      {!loading && !error && searchable && results.length === 0 ? (
        <p className="admin-search-state">No results found</p>
      ) : null}
      {grouped.map(([group, hits]) => (
        <div key={group} className="admin-search-group">
          <h3>{group}</h3>
          {hits.map((hit) => {
            const flatIndex = flatHits.findIndex((h) => h.id === hit.id);
            return (
              <button
                key={hit.id}
                type="button"
                role="option"
                aria-selected={flatIndex === activeIndex}
                className={`admin-search-hit${flatIndex === activeIndex ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(flatIndex)}
                onClick={() => go(hit.href)}
              >
                <strong>{hit.title}</strong>
                <span>{hit.description}</span>
              </button>
            );
          })}
        </div>
      ))}
      {!isInline ? (
        <div className="admin-search-footer">
          <Link href="/admin/bookings" onClick={() => setOpen(false)}>
            All bookings
          </Link>
          <Link href="/admin/guests" onClick={() => setOpen(false)}>
            Guests
          </Link>
        </div>
      ) : null}
    </div>
  ) : null;

  const field = (
    <div className={`admin-search-field${isInline ? " is-inline" : ""}`}>
      <Search size={18} aria-hidden className="admin-search-field-icon" />
      <input
        ref={inputRef}
        id={isInline ? `${dialogId}-inline` : dialogId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onInputKeyDown}
        placeholder="Search bookings, guests or rooms..."
        aria-label="Search bookings, guests or rooms"
        aria-autocomplete="list"
        aria-controls={`${dialogId}-list`}
        autoComplete="off"
      />
      {loading ? (
        <Loader2 size={16} className="spin admin-search-field-status" aria-hidden />
      ) : null}
      {query ? (
        <button
          type="button"
          className="admin-search-clear"
          aria-label="Clear search"
          onClick={clearQuery}
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );

  if (isInline) {
    return (
      <div className="admin-search-inline" id={`${dialogId}-list`}>
        {field}
        {resultsPanel}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="admin-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search admin"
        title="Search"
      >
        <Search size={18} aria-hidden />
        <span className="admin-search-trigger-label">Search…</span>
        <kbd>/</kbd>
      </button>

      {open ? (
        <div
          className="admin-search-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="admin-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogId}
          >
            <div className="admin-search-input-row">{field}</div>
            <div className="admin-search-results" id={`${dialogId}-list`}>
              {resultsPanel}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
