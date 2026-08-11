"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  formatEventDate,
  formatEventTimeRange,
  type PublicEvent,
} from "@/app/events/lib";
import { actionLabel } from "@/lib/event-constants";
import "../events.css";

type TicketType = NonNullable<PublicEvent["ticketTypes"]>[number];

type Props = {
  event: PublicEvent | null;
  open: boolean;
  onClose: () => void;
};

type FormState = {
  ticketTypeId: string;
  quantity: string;
  fullName: string;
  email: string;
  phone: string;
  consentAccepted: boolean;
};

const EMPTY: FormState = {
  ticketTypeId: "",
  quantity: "1",
  fullName: "",
  email: "",
  phone: "",
  consentAccepted: false,
};

type CreatedOrder = {
  reference: string;
  ticketUrl: string;
  ticketTypeName: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  bank: {
    bankName: string;
    bankBranch: string;
    accountName: string;
    accountUsd: string;
    accountZw: string;
    reservationsEmail: string;
    extraInstructions: string;
  };
};

export function EventTicketPurchaseModal({ event, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  const types = useMemo(
    () => (event?.ticketTypes ?? []).filter(Boolean) as TicketType[],
    [event],
  );

  const selected = types.find((t) => String(t.id) === form.ticketTypeId) ?? null;
  const qty = Math.max(1, Number(form.quantity) || 1);
  const total = selected ? selected.price * qty : 0;

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open || !event) return;
    const id = window.setTimeout(() => {
      setCreated(null);
      setError("");
      setForm({
        ...EMPTY,
        ticketTypeId: types[0] ? String(types[0].id) : "",
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, event, types]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 30);
    function onKeyDown(evt: KeyboardEvent) {
      if (evt.key === "Escape") {
        evt.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  function onBackdropMouseDown(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!event || submitting) return;
    if (!form.consentAccepted) {
      setError("Please accept the payment terms to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/events/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId: Number(form.ticketTypeId),
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          quantity: qty,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create ticket order");
      setCreated({
        reference: data.order.reference,
        ticketUrl: data.ticketUrl,
        ticketTypeName: data.order.ticketTypeName,
        quantity: data.order.quantity,
        totalAmount: data.order.totalAmount,
        currency: data.order.currency,
        bank: data.bank,
      });
      toast.success("Order created — use the reference when you pay");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !open || !event) return null;

  return createPortal(
    <div
      className="modal-backdrop event-modal-backdrop"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        className="booking-modal event-reservation-modal event-ticket-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        ref={dialogRef}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={26} aria-hidden="true" />
        </button>
        <p className="eyebrow">
          {actionLabel(event.actionType, event.customActionLabel)}
        </p>
        <h2 id="ticket-modal-title">{event.title}</h2>
        <p className="event-modal-subtitle">
          {formatEventDate(event.startAt, { withWeekday: true, withYear: true })}
          {" · "}
          {formatEventTimeRange(event.startAt, event.endAt)}
        </p>

        {created ? (
          <div className="event-ticket-pay">
            <p className="event-ticket-pay-status">Pending payment</p>
            <p>
              Your order reference is{" "}
              <strong className="event-ticket-ref">{created.reference}</strong>.
              Use this exact reference when you deposit.
            </p>
            <ul className="event-ticket-pay-summary">
              <li>
                <span>Tickets</span>
                <strong>
                  {created.quantity}× {created.ticketTypeName}
                </strong>
              </li>
              <li>
                <span>Amount due</span>
                <strong>
                  {created.currency} {created.totalAmount.toFixed(2)}
                </strong>
              </li>
            </ul>
            <div className="event-ticket-bank">
              <h3>Bank details</h3>
              <p>
                <strong>{created.bank.bankName}</strong>
                <br />
                {created.bank.accountName}
                <br />
                Branch: {created.bank.bankBranch}
              </p>
              <p>
                USD account: <strong>{created.bank.accountUsd}</strong>
                <br />
                ZW account: <strong>{created.bank.accountZw}</strong>
              </p>
              <p className="muted">{created.bank.extraInstructions}</p>
              {created.bank.reservationsEmail ? (
                <p className="muted">
                  Proof of payment:{" "}
                  <a href={`mailto:${created.bank.reservationsEmail}`}>
                    {created.bank.reservationsEmail}
                  </a>
                </p>
              ) : null}
            </div>
            <div className="form-row" style={{ marginTop: 16 }}>
              <Link className="button primary form-submit" href={created.ticketUrl}>
                View order / ticket
              </Link>
              <button type="button" className="button ghost" onClick={onClose}>
                Close
              </button>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              We emailed these details to you. Lost the email later?{" "}
              <Link href="/events/tickets/find">Find my ticket</Link>
            </p>
          </div>
        ) : types.length === 0 ? (
          <p className="form-error">
            Ticket types are not set up for this event yet. Please contact Highbury Lounge.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="form-row">
              <label>
                Ticket type
                <select
                  ref={firstFieldRef}
                  required
                  value={form.ticketTypeId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ticketTypeId: e.target.value }))
                  }
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.currency} {Number(t.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Full name
                <input
                  required
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </label>
            </div>
            <label>
              Phone / WhatsApp
              <input
                required
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </label>
            <p className="event-ticket-total">
              Total due:{" "}
              <strong>
                {selected?.currency || event.currency || "USD"} {total.toFixed(2)}
              </strong>
            </p>
            <label className="event-modal-consent">
              <input
                type="checkbox"
                checked={form.consentAccepted}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    consentAccepted: e.target.checked,
                  }))
                }
              />
              <span>
                I understand tickets are confirmed after bank payment is verified.
              </span>
            </label>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="button primary form-submit" type="submit" disabled={submitting}>
              {submitting ? "Creating order…" : "Get payment details"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
