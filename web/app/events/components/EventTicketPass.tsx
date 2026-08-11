"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  formatEventDayNumber,
  formatEventMonth,
  formatEventWeekday,
  eventPosterImage,
} from "@/app/events/lib";
import "./event-ticket-pass.css";

export type EventTicketPassData = {
  eventTitle: string;
  startAt: string;
  venueName: string | null;
  coverImage: string | null;
  posterImage: string | null;
  ticketTypeName: string;
  currency: string;
  unitPrice: number;
  quantity: number;
  guestName: string;
  reference: string;
  ticketCode: string;
};

function isVipType(name: string) {
  return /\bvip\b/i.test(name);
}

function priceLabel(currency: string, amount: number) {
  const symbol = currency.toUpperCase() === "USD" ? "$" : `${currency} `;
  const n = Number(amount);
  return Number.isInteger(n) ? `${symbol}${n}` : `${symbol}${n.toFixed(2)}`;
}

type Props = {
  data: EventTicketPassData;
  /** Show download control under the pass */
  showDownload?: boolean;
};

export function EventTicketPass({ data, showDownload = true }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const vip = isVipType(data.ticketTypeName);
  const poster = eventPosterImage({
    coverImage: data.coverImage,
    posterImage: data.posterImage,
  });
  const qrPayload = data.ticketCode || data.reference;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(qrPayload)}`;
  const weekday = formatEventWeekday(data.startAt, true).toUpperCase();
  const day = formatEventDayNumber(data.startAt);
  const monthYear = `${formatEventMonth(data.startAt, true).toUpperCase()} ${data.startAt.slice(0, 4)}`;
  const typeLabel = data.ticketTypeName.trim().toUpperCase();
  const displayType = /\bticket\b/i.test(typeLabel)
    ? typeLabel
    : `${typeLabel} TICKET`;

  async function downloadPng() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#1a0a1f",
      });
      const link = document.createElement("a");
      link.download = `${data.reference}-${data.ticketCode || "ticket"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      setError("Could not download ticket image. Try again or use a screenshot.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="event-ticket-pass-wrap">
      <div
        ref={cardRef}
        className={`event-ticket-pass ${vip ? "is-vip" : "is-standard"}`}
      >
        <div
          className="event-ticket-pass-bg"
          style={{ backgroundImage: `url(${poster})` }}
          aria-hidden="true"
        />
        <div className="event-ticket-pass-shade" aria-hidden="true" />

        <div className="event-ticket-pass-main">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="event-ticket-pass-logo"
            src="/images/highbury-lounge-logo-light.png"
            alt="Highbury Lounge"
            crossOrigin="anonymous"
          />
          <div className="event-ticket-pass-title-block">
            <p className="event-ticket-pass-kicker">Highbury Lounge</p>
            <h2 className="event-ticket-pass-title">{data.eventTitle}</h2>
          </div>
          <div className="event-ticket-pass-date">
            <span className="event-ticket-pass-weekday">{weekday}</span>
            <span className="event-ticket-pass-day">{day}</span>
            <span className="event-ticket-pass-month">{monthYear}</span>
          </div>
          <p className="event-ticket-pass-venue">
            {(data.venueName || "Highbury Lounge Kadoma").toUpperCase()}
          </p>
          <p className="event-ticket-pass-guest">{data.guestName}</p>
        </div>

        <div className="event-ticket-pass-stub" aria-hidden="false">
          <span className="event-ticket-pass-badge">{displayType}</span>
          <p className="event-ticket-pass-price">
            {priceLabel(data.currency, data.unitPrice)}
          </p>
          {data.quantity > 1 ? (
            <p className="event-ticket-pass-qty">×{data.quantity}</p>
          ) : null}
          <p className="event-ticket-pass-ref">{data.reference}</p>
          <div className="event-ticket-pass-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="" width={96} height={96} crossOrigin="anonymous" />
            <span>SCAN ME</span>
          </div>
          <p className="event-ticket-pass-code">{data.ticketCode}</p>
        </div>
      </div>

      {showDownload ? (
        <div className="event-ticket-pass-actions">
          <button
            type="button"
            className="button primary"
            onClick={downloadPng}
            disabled={downloading}
          >
            {downloading ? "Preparing…" : "Download ticket"}
          </button>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
