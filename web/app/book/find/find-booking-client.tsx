"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BackLink } from "@/app/components/BackLink";
import { formatDate, formatMoney } from "@/lib/format";

type FoundBooking = {
  reference: string;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  roomsBooked: number;
  currency: string;
  totalAmount: number;
  roomName: string | null;
  guestName: string;
};

export function FindBookingClient() {
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState<FoundBooking | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    setBooking(null);
    try {
      const res = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      if (!data.found) {
        setMessage(
          data.message ||
            "No booking found for that reference. Check the code and try again.",
        );
        return;
      }
      setBooking(data.booking);
      setMessage("We found your booking.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel">
        <BackLink href="/" label="Back" />
        <p className="eyebrow">Booking recovery</p>
        <h1>Find my booking</h1>
        <p className="muted">
          Enter the booking reference from your confirmation (for example
          HL-XXXX-000).
        </p>

        <form className="guest-form" onSubmit={onSubmit} style={{ marginTop: 18 }}>
          <label>
            Booking reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="HL-XXXX-000"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p style={{ margin: 0, color: "#1f6b3a", fontWeight: 600 }}>
              {message}
            </p>
          ) : null}
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "Searching…" : "Find booking"}
          </button>
        </form>

        {booking ? (
          <div className="confirm-panel" style={{ marginTop: 28 }}>
            <h2>{booking.reference}</h2>
            <ul>
              <li>Guest: {booking.guestName || "—"}</li>
              <li>Room: {booking.roomName || "—"}</li>
              <li>
                Stay: {formatDate(booking.checkIn)} to{" "}
                {formatDate(booking.checkOut)} ({booking.nights} night
                {booking.nights === 1 ? "" : "s"})
              </li>
              <li>
                Guests: {booking.adults} adult
                {booking.adults === 1 ? "" : "s"}
                {booking.children > 0
                  ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}`
                  : ""}
              </li>
              <li>Status: {booking.status}</li>
              <li>Payment: {booking.paymentStatus}</li>
              <li>
                Total:{" "}
                {formatMoney(booking.totalAmount, booking.currency)}
              </li>
            </ul>
            <div className="hero-actions" style={{ marginTop: 18 }}>
              <Link className="button primary" href="/">
                Return home
              </Link>
              <Link className="button outline" href="/rooms">
                Browse rooms
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
