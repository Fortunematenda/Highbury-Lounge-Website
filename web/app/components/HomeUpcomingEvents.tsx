"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventReservationModal } from "@/app/events/components/EventReservationModal";
import { EventTicketPurchaseModal } from "@/app/events/components/EventTicketPurchaseModal";
import {
  eventBannerImage,
  formatEventDayNumber,
  formatEventMonth,
  formatEventTime,
  formatEventWeekday,
  resolveEventAction,
  type PublicEvent,
} from "@/app/events/lib";

type HomeEvent = PublicEvent;

function dayNumber(startAt: string) {
  const n = Number(formatEventDayNumber(startAt));
  return Number.isFinite(n) ? String(n) : "--";
}

function EventActionButton({
  event,
  onReserve,
}: {
  event: HomeEvent;
  onReserve: (event: HomeEvent) => void;
}) {
  const action = resolveEventAction(event);
  const className = "button outline home-event-action";

  if (action.kind === "reserve" || action.kind === "tickets") {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onReserve(event)}
      >
        {action.label}
      </button>
    );
  }

  if (action.kind === "whatsapp" || action.kind === "external") {
    return (
      <a className={className} href={action.href} target="_blank" rel="noreferrer">
        {action.label}
      </a>
    );
  }

  return (
    <Link className={className} href={`/events/${event.slug}`}>
      {action.label}
    </Link>
  );
}

function EventCard({
  event,
  onReserve,
}: {
  event: HomeEvent;
  onReserve: (event: HomeEvent) => void;
}) {
  const image = eventBannerImage(event);
  const weekday = formatEventWeekday(event.startAt, true);
  const time = formatEventTime(event.startAt);
  const href = `/events/${event.slug}`;

  return (
    <article className="home-event-card">
      <Link
        href={href}
        className="home-event-image-wrap"
        aria-label={event.title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback) return;
            img.dataset.fallback = "1";
            img.src = "/images/events.jpg";
          }}
        />
      </Link>

      <div className="home-event-information">
        <div className="home-event-date-badge" aria-hidden="true">
          <span className="home-event-day">{dayNumber(event.startAt)}</span>
          <span className="home-event-month">
            {formatEventMonth(event.startAt).toUpperCase()}
          </span>
        </div>

        <div className="home-event-details">
          <h3>
            <Link href={href}>{event.title}</Link>
          </h3>
          <p>
            {weekday}
            {time ? (
              <>
                {" "}
                <span aria-hidden="true">•</span> {time}
              </>
            ) : null}
          </p>
        </div>

        <div className="home-event-action-wrap">
          <EventActionButton event={event} onReserve={onReserve} />
        </div>
      </div>
    </article>
  );
}

export function HomeUpcomingEvents() {
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<HomeEvent | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);

  function openAction(event: HomeEvent) {
    setSelectedEvent(event);
    if (event.actionType === "book_tickets") {
      setTicketsOpen(true);
      setReserveOpen(false);
    } else {
      setReserveOpen(true);
      setTicketsOpen(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/events?scope=upcoming&limit=3");
        if (!res.ok) return;
        const data = (await res.json()) as { events?: HomeEvent[] };
        if (!cancelled) setEvents(data.events ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || events.length === 0) return null;

  const count = events.length;
  const gridClass =
    count === 1
      ? "home-events-grid is-one"
      : count === 2
        ? "home-events-grid is-two"
        : "home-events-grid is-three";

  return (
    <section
      className="home-events-section"
      id="events"
      aria-labelledby="home-events-title"
    >
      <div className="home-container">
        <div className="home-events-head">
          <div className="home-events-copy">
            <p className="eyebrow">What&apos;s on</p>
            <h2
              id="home-events-title"
              className="home-section-title upcoming-events-title"
            >
              Upcoming Events at Highbury
            </h2>
            <p className="home-events-sub">
              Live music, unforgettable evenings and special experiences in the
              heart of Kadoma.
            </p>
          </div>
          <Link className="button outline home-events-all" href="/events">
            View All Events
          </Link>
        </div>

        <div className={gridClass}>
          {events.slice(0, 3).map((event) => (
            <EventCard key={event.id} event={event} onReserve={openAction} />
          ))}
        </div>
      </div>

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
    </section>
  );
}
