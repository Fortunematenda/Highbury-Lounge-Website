"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  Gauge,
  MapPin,
  Shirt,
  Ticket,
  Users2,
} from "lucide-react";
import { EventCard } from "../components/EventCard";
import { EventReservationModal } from "../components/EventReservationModal";
import { EventTicketPurchaseModal } from "../components/EventTicketPurchaseModal";
import {
  eventBannerImage,
  eventMapsHref,
  formatEventDate,
  formatEventTimeRange,
  resolveEventAction,
  whatsappHref,
  type PublicEvent,
} from "../lib";

type Props = {
  event: PublicEvent;
  related: PublicEvent[];
  whatsappNumber: string;
};

export function EventDetailClient({ event, related, whatsappNumber }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);

  function openAction(target: PublicEvent) {
    setSelectedEvent(target);
    if (target.actionType === "book_tickets") {
      setTicketsOpen(true);
      setReserveOpen(false);
    } else {
      setReserveOpen(true);
      setTicketsOpen(false);
    }
  }

  const action = resolveEventAction(event, whatsappNumber);
  const directionsHref = eventMapsHref(
    event.venueAddress || "7504 Greenfield Cherries, Kadoma, Zimbabwe",
  );
  const askWhatsappHref = whatsappHref(
    whatsappNumber,
    `Hi Highbury Lounge, I have a question about "${event.title}" on ${formatEventDate(
      event.startAt,
      { withYear: true },
    )}.`,
  );

  const ctaButton =
    action.kind === "reserve" || action.kind === "tickets" ? (
      <button
        type="button"
        className="button primary event-sticky-cta"
        onClick={() => openAction(event)}
      >
        {action.label}
      </button>
    ) : action.kind === "whatsapp" || action.kind === "external" ? (
      <a
        className="button primary event-sticky-cta"
        href={action.href}
        target="_blank"
        rel="noreferrer"
      >
        {action.label}
      </a>
    ) : (
      <span className="event-sticky-status">
        {event.availability === "Sold Out"
          ? "Sold Out"
          : event.availability === "Cancelled"
            ? "Cancelled"
            : "Reservations Closed"}
      </span>
    );

  return (
    <main className="event-detail-page">
      <nav className="event-detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/events">Events</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{event.title}</span>
      </nav>

      <section className="event-detail-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={eventBannerImage(event)}
          alt=""
          aria-hidden="true"
        />
        <div className="event-detail-hero-shade" />
        <div className="event-detail-hero-copy">
          <span className="event-card-category is-light">{event.category}</span>
          <h1>{event.title}</h1>
          <ul className="event-detail-hero-meta">
            <li>
              <CalendarDays size={16} aria-hidden="true" />
              {formatEventDate(event.startAt, { withYear: true, withWeekday: true })}
            </li>
            <li>
              <Clock3 size={16} aria-hidden="true" />
              {formatEventTimeRange(event.startAt, event.endAt)}
            </li>
            <li>
              <MapPin size={16} aria-hidden="true" />
              {event.venueName}
            </li>
          </ul>
        </div>
      </section>

      <div className="event-detail-layout">
        <article className="event-detail-content">
          {event.availability === "Postponed" ? (
            <p className="form-error" role="status">
              This event has been postponed. Please check back for updated
              details, or reach out to us on WhatsApp.
            </p>
          ) : null}
          {event.availability === "Cancelled" ? (
            <p className="form-error" role="status">
              This event has been cancelled.
            </p>
          ) : null}

          {event.description ? (
            <section className="event-detail-section">
              <h2>About This Event</h2>
              {event.description.split(/\n{2,}/).map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </section>
          ) : null}

          {event.programme.length > 0 ? (
            <section className="event-detail-section">
              <h2>Programme</h2>
              <ol className="event-programme-list">
                {event.programme.map((item, idx) => (
                  <li key={idx}>
                    <span className="event-programme-time">{item.time}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.detail ? <p>{item.detail}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {event.dressCode || event.ageNote || event.attendanceInfo ? (
            <section className="event-detail-section">
              <h2>Good to Know</h2>
              <ul className="event-detail-notes">
                {event.dressCode ? (
                  <li>
                    <Shirt size={16} aria-hidden="true" />
                    <span>
                      <strong>Dress Code:</strong> {event.dressCode}
                    </span>
                  </li>
                ) : null}
                {event.ageNote ? (
                  <li>
                    <Users2 size={16} aria-hidden="true" />
                    <span>
                      <strong>Age:</strong> {event.ageNote}
                    </span>
                  </li>
                ) : null}
                {event.attendanceInfo ? (
                  <li>
                    <Gauge size={16} aria-hidden="true" />
                    <span>{event.attendanceInfo}</span>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {event.gallery.length > 0 ? (
            <section className="event-detail-section">
              <h2>Gallery</h2>
              <div className="event-detail-gallery">
                {event.gallery.map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={url}
                    alt={`${event.title} photo ${idx + 1}`}
                    loading="lazy"
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="event-detail-section event-detail-map">
            <h2>Location</h2>
            <p>
              {event.venueName} · {event.venueAddress}
            </p>
            <div className="hero-actions">
              <a
                className="button ghost"
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={16} aria-hidden="true" />
                Get Directions
              </a>
              <a
                className="button ghost"
                href={askWhatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                Ask on WhatsApp
              </a>
            </div>
          </section>
        </article>

        <aside className="event-sticky-card">
          <div className="event-sticky-card-inner">
            <span className="event-card-price event-sticky-price">
              {event.priceLabel}
            </span>
            {event.availability === "Limited Space" ? (
              <span className="event-card-availability is-limited-space">
                Limited Space
              </span>
            ) : null}
            {event.availability === "Sold Out" ? (
              <span className="event-card-availability is-sold-out">Sold Out</span>
            ) : null}
            {event.trackCapacity &&
            event.remaining != null &&
            event.availability !== "Sold Out" ? (
              <p className="event-sticky-remaining">
                <Ticket size={14} aria-hidden="true" />
                {event.remaining} spot{event.remaining === 1 ? "" : "s"} remaining
              </p>
            ) : null}
            {ctaButton}
            <dl className="event-sticky-facts">
              <div>
                <dt>Guests per booking</dt>
                <dd>
                  {event.minGuests}–{event.maxGuestsPerReservation}
                </dd>
              </div>
              {event.artistOrHost ? (
                <div>
                  <dt>Hosted by</dt>
                  <dd>{event.artistOrHost}</dd>
                </div>
              ) : null}
              <div>
                <dt>Venue</dt>
                <dd>{event.venueName}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <div className="event-sticky-bar-mobile">
        <div className="event-sticky-bar-info">
          <span className="event-card-price">{event.priceLabel}</span>
          {event.availability === "Limited Space" ? (
            <small className="event-sticky-bar-note">Limited Space</small>
          ) : null}
          {event.availability === "Sold Out" ? (
            <small className="event-sticky-bar-note">Sold Out</small>
          ) : null}
        </div>
        {ctaButton}
      </div>

      {related.length > 0 ? (
        <section className="section event-related-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">MORE TO EXPLORE</p>
              <h2>You Might Also Like</h2>
            </div>
          </div>
          <div className="events-grid">
            {related.map((item) => (
              <EventCard
                key={item.id}
                event={item}
                onReserve={openAction}
                whatsappNumber={whatsappNumber}
              />
            ))}
          </div>
        </section>
      ) : null}

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
