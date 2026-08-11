import Link from "next/link";
import { CalendarDays, Clock3, Users2 } from "lucide-react";
import {
  CATEGORY_ICONS,
  eventBannerImage,
  formatEventDayNumber,
  formatEventMonth,
  formatEventTimeRange,
  formatEventWeekday,
  resolveEventAction,
  type PublicEvent,
} from "@/app/events/lib";

type EventCardProps = {
  event: PublicEvent;
  variant?: "grid" | "featured" | "past";
  whatsappNumber?: string;
  onReserve?: (event: PublicEvent) => void;
};

export function EventCard({
  event,
  variant = "grid",
  whatsappNumber,
  onReserve,
}: EventCardProps) {
  const isPast = variant === "past";
  const href = `/events/${event.slug}`;
  const CategoryIcon = CATEGORY_ICONS[event.category] ?? CATEGORY_ICONS.Other;
  const action = isPast ? null : resolveEventAction(event, whatsappNumber);

  const showAvailabilityBadge =
    !isPast &&
    (event.availability === "Sold Out" ||
      event.availability === "Limited Space" ||
      event.availability === "Postponed" ||
      event.availability === "Cancelled");

  return (
    <article className={`event-card event-card--${variant}`}>
      <Link href={href} className="event-card-media" aria-label={event.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={eventBannerImage(event)}
          alt=""
          loading={variant === "featured" ? "eager" : "lazy"}
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback) return;
            img.dataset.fallback = "1";
            img.src = "/images/events.jpg";
          }}
        />
        <span className="event-card-date-badge">
          <strong>{formatEventDayNumber(event.startAt)}</strong>
          <small>{formatEventMonth(event.startAt)}</small>
        </span>
        {showAvailabilityBadge ? (
          <span
            className={`event-card-availability is-${event.availability
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {event.availability}
          </span>
        ) : null}
        {isPast ? <span className="event-card-past-badge">Past Event</span> : null}
      </Link>

      <div className="event-card-body">
        <span className="event-card-category">
          <CategoryIcon size={13} aria-hidden="true" />
          {event.category}
        </span>
        <Link href={href} className="event-card-title-link">
          <h3>{event.title}</h3>
        </Link>
        {event.shortDescription ? (
          <p className="event-card-desc">{event.shortDescription}</p>
        ) : null}
        <ul className="event-card-meta">
          <li>
            <CalendarDays size={14} aria-hidden="true" />
            {formatEventWeekday(event.startAt, true)}, {formatEventDayNumber(event.startAt)}{" "}
            {formatEventMonth(event.startAt)}
          </li>
          <li>
            <Clock3 size={14} aria-hidden="true" />
            {formatEventTimeRange(event.startAt, event.endAt)}
          </li>
          {event.artistOrHost ? (
            <li>
              <Users2 size={14} aria-hidden="true" />
              {event.artistOrHost}
            </li>
          ) : null}
        </ul>
        <div className="event-card-footer">
          <span className="event-card-price">{event.priceLabel}</span>
          {isPast ? (
            <Link href={href} className="text-link event-card-cta">
              View Recap
            </Link>
          ) : (action?.kind === "reserve" || action?.kind === "tickets") &&
            onReserve ? (
            <button
              type="button"
              className="event-card-cta-button"
              onClick={() => onReserve(event)}
            >
              {action.label}
            </button>
          ) : action?.kind === "whatsapp" || action?.kind === "external" ? (
            <a
              className="event-card-cta-button"
              href={action.href}
              target="_blank"
              rel="noreferrer"
            >
              {action.label}
            </a>
          ) : (
            <Link href={href} className="text-link event-card-cta">
              View Details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
