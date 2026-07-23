"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { BackLink } from "@/app/components/BackLink";
import { formatMoney } from "@/lib/format";

type RoomSummary = {
  id: number;
  name: string;
  effectivePrice: number;
  nights: number;
  estimatedTotal: number;
  shortDescription: string | null;
  featuredImage: string | null;
};

function BookInner() {
  const params = useSearchParams();
  const router = useRouter();
  const roomTypeId = Number(params.get("roomTypeId"));
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Number(params.get("adults") ?? "1");
  const children = Number(params.get("children") ?? "0");
  const rooms = Number(params.get("rooms") ?? "1");

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [step, setStep] = useState<"form" | "summary">("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsapp: "",
    country: "Zimbabwe",
    specialRequests: "",
    estimatedArrival: "",
    termsAccepted: false,
  });

  useEffect(() => {
    async function load() {
      if (!roomTypeId || !checkIn || !checkOut) return;
      const qs = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
        rooms: String(rooms),
      });
      const res = await fetch(`/api/availability?${qs}`);
      const data = await res.json();
      const match = (data.results ?? []).find(
        (r: RoomSummary) => r.id === roomTypeId,
      );
      setRoom(match ?? null);
      if (!match) setError("This room is no longer available for your dates.");
    }
    void load();
  }, [roomTypeId, checkIn, checkOut, adults, children, rooms]);

  const guestLabel = useMemo(
    () =>
      `${adults} adult${adults === 1 ? "" : "s"}${
        children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : ""
      }`,
    [adults, children],
  );

  function goSummary(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.termsAccepted) {
      setError("Please accept the booking terms to continue.");
      return;
    }
    setStep("summary");
  }

  async function submitBooking() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId,
          checkIn,
          checkOut,
          adults,
          children,
          roomsBooked: rooms,
          guest: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      router.push(
        `/book/success?reference=${encodeURIComponent(data.booking.reference)}&total=${data.booking.totalAmount}&currency=${data.booking.currency}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="booking-flow">
      <section className="booking-flow-panel">
        <BackLink
          href={`/rooms/search?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&adults=${adults}&children=${children}&rooms=${rooms}`}
          label="Back to results"
        />
        <p className="eyebrow">Reserve your stay</p>
        <h1>{step === "form" ? "Guest details" : "Confirm booking"}</h1>

        {room && (
          <aside className="booking-summary-card">
            <img src={room.featuredImage || "/images/deluxe-room.jpg"} alt={room.name} />
            <div>
              <h2>{room.name}</h2>
              <p>{room.shortDescription}</p>
              <p>
                {checkIn} → {checkOut} · {room.nights} night
                {room.nights === 1 ? "" : "s"}
              </p>
              <p>{guestLabel} · {rooms} room{rooms === 1 ? "" : "s"}</p>
              <p>
                {formatMoney(room.effectivePrice)} / night · Total{" "}
                <strong>{formatMoney(room.estimatedTotal)}</strong>
              </p>
            </div>
          </aside>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {step === "form" ? (
          <form className="guest-form" onSubmit={goSummary}>
            <div className="form-row">
              <label>
                First name
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </label>
              <label>
                Last name
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                WhatsApp (optional)
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </label>
              <label>
                Country
                <input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </label>
            </div>
            <label>
              Estimated arrival (optional)
              <input
                type="time"
                value={form.estimatedArrival}
                onChange={(e) =>
                  setForm({ ...form, estimatedArrival: e.target.value })
                }
              />
            </label>
            <label>
              Special requests
              <textarea
                rows={4}
                value={form.specialRequests}
                onChange={(e) =>
                  setForm({ ...form, specialRequests: e.target.value })
                }
              />
            </label>
            <label className="check-choice">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) =>
                  setForm({ ...form, termsAccepted: e.target.checked })
                }
              />
              I accept the Highbury Lounge booking terms. Payment is arranged after confirmation.
            </label>
            <button className="button primary" type="submit" disabled={!room}>
              Review booking
            </button>
          </form>
        ) : (
          <div className="confirm-panel">
            <h2>Booking summary</h2>
            <ul>
              <li>
                Guest: {form.firstName} {form.lastName}
              </li>
              <li>Email: {form.email}</li>
              <li>Phone: {form.phone}</li>
              <li>Room: {room?.name}</li>
              <li>
                Stay: {checkIn} to {checkOut}
              </li>
              <li>Guests: {guestLabel}</li>
              <li>Total due later: {formatMoney(room?.estimatedTotal ?? 0)}</li>
            </ul>
            <p className="muted">
              Submitting creates a <strong>Pending</strong> reservation. No payment is taken online yet.
            </p>
            <div className="hero-actions">
              <button className="button ghost" type="button" onClick={() => setStep("form")}>
                Edit details
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => void submitBooking()}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Confirm reservation"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<main className="booking-flow"><p>Loading…</p></main>}>
      <BookInner />
    </Suspense>
  );
}
