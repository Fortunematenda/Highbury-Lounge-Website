"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

type Announcement = {
  title: string;
  slug: string;
  startAt: string;
};

export function EventAnnouncementBanner() {
  const [event, setEvent] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/events?limit=1&announcement=1");
        if (!res.ok) return;
        const data = (await res.json()) as {
          announcement?: Announcement | null;
        };
        if (cancelled) return;
        if (data.announcement?.slug) {
          const key = `hl-event-banner-${data.announcement.slug}`;
          if (sessionStorage.getItem(key) === "1") {
            setDismissed(true);
            return;
          }
          setEvent({
            title: data.announcement.title,
            slug: data.announcement.slug,
            startAt: data.announcement.startAt,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!event || dismissed) return null;

  const dateLabel = new Date(`${event.startAt.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short" },
  );

  return (
    <div className="event-announce" role="region" aria-label="Featured event">
      <p>
        <span>Featured</span>
        <strong>{event.title}</strong>
        <em>{dateLabel}</em>
      </p>
      <div className="event-announce-actions">
        <Link href={`/events/${event.slug}`}>View event</Link>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            sessionStorage.setItem(`hl-event-banner-${event.slug}`, "1");
            setDismissed(true);
          }}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
