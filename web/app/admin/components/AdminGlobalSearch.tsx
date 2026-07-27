"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

type SearchHit = {
  id: string;
  title: string;
  description: string;
  href: string;
  group: string;
};

export function AdminGlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey))) && !typing) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Search failed");
          if (!cancelled) setResults(data.results ?? []);
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
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query]);

  const searchable = query.trim().length >= 2;
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
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        className="admin-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search admin"
      >
        <Search size={16} aria-hidden />
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
            <div className="admin-search-input-row">
              <Search size={18} aria-hidden />
              <input
                ref={inputRef}
                id={dialogId}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bookings, guests, rooms, menus…"
                aria-label="Global admin search"
              />
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Close search"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="admin-search-results">
              {loading ? (
                <p className="admin-search-state">
                  <Loader2 size={16} className="spin" aria-hidden /> Searching…
                </p>
              ) : null}
              {error ? <p className="admin-search-state error">{error}</p> : null}
              {!loading && !error && !searchable ? (
                <p className="admin-search-state">Type at least 2 characters</p>
              ) : null}
              {!loading && !error && searchable && results.length === 0 ? (
                <p className="admin-search-state">No results found</p>
              ) : null}
              {grouped.map(([group, hits]) => (
                <div key={group} className="admin-search-group">
                  <h3>{group}</h3>
                  {hits.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      className="admin-search-hit"
                      onClick={() => go(hit.href)}
                    >
                      <strong>{hit.title}</strong>
                      <span>{hit.description}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="admin-search-footer">
                <Link href="/admin/bookings" onClick={() => setOpen(false)}>
                  All bookings
                </Link>
                <Link href="/admin/guests" onClick={() => setOpen(false)}>
                  Guests
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
