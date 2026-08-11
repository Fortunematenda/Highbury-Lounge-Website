"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarRange,
  ChevronDown,
  Loader2,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { EVENT_CATEGORIES } from "@/lib/event-constants";
import { EventCard } from "./components/EventCard";
import { EventReservationModal } from "./components/EventReservationModal";
import { EventTicketPurchaseModal } from "./components/EventTicketPurchaseModal";
import { EventsSubscribe } from "./components/EventsSubscribe";
import { eventBannerImage, formatEventDate, resolveEventAction, type PublicEvent } from "./lib";

const RANGE_OPTIONS = [
  { value: "", label: "All Upcoming" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

const PAST_PAGE_SIZE = 6;

export type EventFilters = {
  q: string;
  category: string;
  range: string;
  free: boolean;
};

type Props = {
  upcoming: PublicEvent[];
  featured: PublicEvent | null;
  initialPast: PublicEvent[];
  filters: EventFilters;
  whatsappNumber: string;
};

export function EventsPageClient({
  upcoming,
  featured,
  initialPast,
  filters,
  whatsappNumber,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(filters.q);
  const [past, setPast] = useState(initialPast);
  const [pastOffset, setPastOffset] = useState(initialPast.length);
  const [pastHasMore, setPastHasMore] = useState(
    initialPast.length >= PAST_PAGE_SIZE,
  );
  const [loadingPast, setLoadingPast] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchInput(filters.q), 0);
    return () => window.clearTimeout(id);
  }, [filters.q]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPast(initialPast);
      setPastOffset(initialPast.length);
      setPastHasMore(initialPast.length >= PAST_PAGE_SIZE);
    }, 0);
    return () => window.clearTimeout(id);
  }, [initialPast]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function onSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value.trim() || null });
    }, 400);
  }

  function onCategoryClick(category: string) {
    updateParams({ category: category === filters.category ? null : category || null });
  }

  function onRangeChange(value: string) {
    updateParams({ range: value || null });
  }

  function onFreeToggle() {
    updateParams({ free: filters.free ? null : "1" });
  }

  function clearFilters() {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }

  const hasActiveFilters = Boolean(
    filters.q || filters.category || filters.range || filters.free,
  );

  async function loadMorePast() {
    setLoadingPast(true);
    try {
      const res = await fetch(
        `/api/events?scope=past&limit=${PAST_PAGE_SIZE}&offset=${pastOffset}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      const nextPast = (data.events ?? []) as PublicEvent[];
      setPast((prev) => [...prev, ...nextPast]);
      setPastOffset((prev) => prev + nextPast.length);
      setPastHasMore(nextPast.length >= PAST_PAGE_SIZE);
    } catch {
      setPastHasMore(false);
    } finally {
      setLoadingPast(false);
    }
  }

  function openAction(event: PublicEvent) {
    setSelectedEvent(event);
    if (event.actionType === "book_tickets") {
      setTicketsOpen(true);
      setReserveOpen(false);
    } else {
      setReserveOpen(true);
      setTicketsOpen(false);
    }
  }

  function scrollToUpcoming() {
    document
      .getElementById("upcoming-events")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const featuredAction = featured ? resolveEventAction(featured, whatsappNumber) : null;

  return (
    <main className="events-page">
      <section className="events-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/events.jpg" alt="" aria-hidden="true" />
        <div className="events-hero-shade" />
        <div className="events-hero-copy">
          <p className="eyebrow light">WHAT&apos;S ON</p>
          <h1>Events at Highbury</h1>
          <p className="events-hero-text">
            From live music and long dinner tables to private celebrations
            under the Kadoma sky, Highbury Lounge is where memorable nights
            come to life. Discover what&apos;s on and reserve your place.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="button primary"
              onClick={scrollToUpcoming}
            >
              Explore Upcoming Events
            </button>
            <Link href="/conference" className="button ghost">
              Host Your Event
            </Link>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="section events-featured-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                <Sparkles size={13} aria-hidden="true" /> FEATURED EVENT
              </p>
              <h2>Don&apos;t Miss This</h2>
            </div>
          </div>
          <div className="event-featured-card">
            <Link href={`/events/${featured.slug}`} className="event-featured-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={eventBannerImage(featured)} alt={featured.title} />
            </Link>
            <div className="event-featured-body">
              <span className="event-card-category">{featured.category}</span>
              <Link href={`/events/${featured.slug}`}>
                <h3>{featured.title}</h3>
              </Link>
              {featured.shortDescription ? <p>{featured.shortDescription}</p> : null}
              <ul className="event-card-meta">
                <li>
                  <CalendarRange size={14} aria-hidden="true" />
                  {formatEventDate(featured.startAt, {
                    withYear: true,
                    withWeekday: true,
                  })}
                </li>
                <li>
                  <MapPin size={14} aria-hidden="true" />
                  {featured.venueName}
                </li>
              </ul>
              <div className="event-featured-actions">
                <span className="event-card-price">{featured.priceLabel}</span>
                {featuredAction?.kind === "reserve" ||
                featuredAction?.kind === "tickets" ? (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => openAction(featured)}
                  >
                    {featuredAction.label}
                  </button>
                ) : featuredAction?.kind === "whatsapp" ||
                  featuredAction?.kind === "external" ? (
                  <a
                    className="button primary"
                    href={featuredAction.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {featuredAction.label}
                  </a>
                ) : (
                  <Link href={`/events/${featured.slug}`} className="button primary">
                    View Details
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section events-list-section" id="upcoming-events">
        <div className="section-head">
          <div>
            <p className="eyebrow">UPCOMING</p>
            <h2>What&apos;s Coming Up</h2>
          </div>
        </div>

        <div className="events-filter-bar">
          <label className="events-search-field">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events, artists, hosts…"
              aria-label="Search events"
            />
          </label>
          <div className="events-chip-row" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={!filters.category ? "events-chip is-active" : "events-chip"}
              onClick={() => onCategoryClick("")}
            >
              All Categories
            </button>
            {EVENT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={
                  filters.category === category ? "events-chip is-active" : "events-chip"
                }
                onClick={() => onCategoryClick(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="events-filter-controls">
            <label className="events-range-select">
              <select
                value={filters.range}
                onChange={(e) => onRangeChange(e.target.value)}
                aria-label="Filter by date range"
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
            <label className="events-free-toggle">
              <input type="checkbox" checked={filters.free} onChange={onFreeToggle} />
              Free entry only
            </label>
            {hasActiveFilters ? (
              <button
                type="button"
                className="text-link text-link-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {upcoming.length === 0 ? (
          <div className="no-availability events-empty-state">
            <strong>No events match your filters</strong>
            <p>
              Try widening your search or check back soon — we host something
              new every month.
            </p>
            {hasActiveFilters ? (
              <button type="button" className="button ghost" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="events-grid">
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onReserve={openAction}
                whatsappNumber={whatsappNumber}
              />
            ))}
          </div>
        )}
      </section>

      <section
        className={[
          "section",
          "events-past-section",
          past.length === 0 ? "is-empty" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">LOOKING BACK</p>
            <h2>Recent Highlights</h2>
          </div>
        </div>
        {past.length === 0 ? (
          <p className="muted events-past-empty">No past events to show yet.</p>
        ) : (
          <>
            <div className="events-grid events-grid--past">
              {past.map((event) => (
                <EventCard key={event.id} event={event} variant="past" />
              ))}
            </div>
            {pastHasMore ? (
              <div className="events-load-more">
                <button
                  type="button"
                  className="button ghost"
                  onClick={loadMorePast}
                  disabled={loadingPast}
                >
                  {loadingPast ? (
                    <Loader2 className="spin" size={16} aria-hidden="true" />
                  ) : null}
                  {loadingPast ? "Loading…" : "Load More Past Events"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="section events-subscribe-section">
        <EventsSubscribe />
        <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
          Already bought tickets?{" "}
          <Link href="/events/tickets/find">Find my ticket</Link>
        </p>
      </section>

      <EventReservationModal
        event={selectedEvent}
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
      />
      <EventTicketPurchaseModal
        event={selectedEvent}
        open={ticketsOpen}
        onClose={() => setTicketsOpen(false)}
      />
    </main>
  );
}
