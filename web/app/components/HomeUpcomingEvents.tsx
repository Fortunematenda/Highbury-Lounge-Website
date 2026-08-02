"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin } from "lucide-react";

type HomeEvent = {
  id: number;
  title: string;
  slug: string;
  startAt: string;
  venueName: string;
  coverImage: string | null;
  posterImage: string | null;
  priceLabel: string;
};

function formatDay(startAt: string) {
  return new Date(`${startAt.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function formatTime(startAt: string) {
  const time = startAt.includes("T") ? startAt.slice(11, 16) : "";
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}

export function HomeUpcomingEvents() {
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  return (
    <section className="section home-events-section" id="events" aria-labelledby="home-events-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">What&apos;s on</p>
          <h2 id="home-events-title">Upcoming Events at Highbury</h2>
        </div>
        <Link className="button ghost" href="/events">
          View All Events
        </Link>
      </div>
      <div className="home-events-grid">
        {events.map((event) => {
          const image =
            event.coverImage || event.posterImage || "/images/events.jpg";
          return (
            <article key={event.id} className="home-event-card">
              <Link href={`/events/${event.slug}`} className="home-event-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" />
              </Link>
              <div className="home-event-body">
                <h3>
                  <Link href={`/events/${event.slug}`}>{event.title}</Link>
                </h3>
                <ul>
                  <li>
                    <CalendarDays size={14} aria-hidden />
                    {formatDay(event.startAt)}
                  </li>
                  {formatTime(event.startAt) ? (
                    <li>
                      <Clock3 size={14} aria-hidden />
                      {formatTime(event.startAt)}
                    </li>
                  ) : null}
                  <li>
                    <MapPin size={14} aria-hidden />
                    {event.venueName}
                  </li>
                </ul>
                <p className="home-event-price">{event.priceLabel}</p>
                <Link className="button" href={`/events/${event.slug}`}>
                  View Event
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
