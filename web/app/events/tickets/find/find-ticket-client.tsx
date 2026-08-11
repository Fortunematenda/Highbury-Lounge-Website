"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type FoundOrder = {
  reference: string;
  paymentStatus: string;
  ticketTypeName: string;
  quantity: number;
  eventTitle: string | null;
  eventStartAt: string | null;
  ticketUrl: string;
  ticketCode: string | null;
};

type Props = {
  /** Compact section layout for the public events page. */
  embedded?: boolean;
};

export function FindTicketClient({ embedded = false }: Props) {
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<FoundOrder[]>([]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    setOrders([]);
    try {
      const res = await fetch("/api/events/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          // Prefer reference when both are filled — phone was over-filtering.
          reference: reference.trim() || undefined,
          phone: reference.trim() ? undefined : phone.trim() || undefined,
          resendEmail: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      if (!data.found) {
        setMessage(
          data.message ||
            "No matching ticket order was found. Check your details and try again.",
        );
        return;
      }
      setOrders(data.orders || []);
      setMessage(
        "We found your order. A copy of the link has also been emailed if mail delivery is configured.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  const heading = embedded ? (
    <h2 id="find-ticket-title">Find my ticket</h2>
  ) : (
    <h1>Find my ticket</h1>
  );

  const body = (
    <>
      <p className="eyebrow">{embedded ? "TICKET RECOVERY" : "Ticket recovery"}</p>
      {heading}
      <p className={embedded ? "events-find-ticket-lead" : "muted"}>
        Use the same email from your order, plus your order reference (for
        example HL-AB12CD). Phone is only needed if you don’t have the
        reference.
      </p>

      <form className="event-find-ticket-form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Order reference
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="HL-XXXXXX"
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
          />
        </label>
        <label>
          Phone / WhatsApp
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Only if you don’t have the reference"
            autoComplete="tel"
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="event-find-ticket-msg">{message}</p> : null}
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Searching…" : "Find ticket"}
        </button>
      </form>

      {orders.length > 0 ? (
        <ul className="event-find-ticket-results">
          {orders.map((order) => (
            <li key={order.reference}>
              <div>
                <strong className="event-ticket-ref">{order.reference}</strong>
                <p>
                  {order.eventTitle || "Event"} · {order.quantity}×{" "}
                  {order.ticketTypeName}
                </p>
                <p className="muted">
                  Status: {order.paymentStatus}
                  {order.ticketCode ? ` · Code ${order.ticketCode}` : ""}
                </p>
              </div>
              <Link className="button primary" href={order.ticketUrl}>
                Open ticket
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="events-find-ticket" aria-labelledby="find-ticket-title">
        {body}
      </div>
    );
  }

  return <div className="event-ticket-card">{body}</div>;
}
