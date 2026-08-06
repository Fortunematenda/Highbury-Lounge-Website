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
import { X } from "lucide-react";
import { toast } from "sonner";
import { actionLabel } from "@/lib/event-constants";
import {
  formatEventDate,
  formatEventTimeRange,
  type PublicEvent,
} from "@/app/events/lib";

type Props = {
  event: PublicEvent | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (reference: string) => void;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  guestCount: string;
  seatingRequest: string;
  notes: string;
  consentAccepted: boolean;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  guestCount: "2",
  seatingRequest: "",
  notes: "",
  consentAccepted: false,
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function EventReservationModal({ event, open, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open || !event) return;
    const id = window.setTimeout(() => {
      const defaultGuests = Math.min(
        Math.max(event.minGuests || 1, 2),
        event.maxGuestsPerReservation || 10,
      );
      setForm({ ...EMPTY_FORM, guestCount: String(defaultGuests) });
      setError("");
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, event]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 30);

    function onKeyDown(evt: KeyboardEvent) {
      if (evt.key === "Escape") {
        evt.preventDefault();
        onClose();
        return;
      }
      if (evt.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (evt.shiftKey && document.activeElement === first) {
        evt.preventDefault();
        last.focus();
      } else if (!evt.shiftKey && document.activeElement === last) {
        evt.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const guestOptions = useMemo(() => {
    if (!event) return [] as number[];
    const min = Math.max(1, event.minGuests || 1);
    const max = Math.max(min, event.maxGuestsPerReservation || 10);
    const options: number[] = [];
    for (let i = min; i <= max; i += 1) options.push(i);
    return options;
  }, [event]);

  if (!mounted || !open || !event) return null;

  function onBackdropMouseDown(evt: MouseEvent<HTMLDivElement>) {
    if (evt.target === evt.currentTarget) onClose();
  }

  function validate(): string | null {
    if (!form.fullName.trim()) return "Please enter your full name.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailPattern.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }
    if (!form.phone.trim()) return "Please enter a phone number.";
    if (!Number.isFinite(Number(form.guestCount)) || Number(form.guestCount) < 1) {
      return "Please select at least 1 guest.";
    }
    if (!form.consentAccepted) {
      return "Please accept the consent checkbox to continue.";
    }
    return null;
  }

  async function onSubmit(evt: FormEvent) {
    evt.preventDefault();
    if (!event || submitting) return;
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          guestCount: Number(form.guestCount),
          seatingRequest: form.seatingRequest.trim() || undefined,
          notes: form.notes.trim() || undefined,
          consentAccepted: form.consentAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit reservation.");
      }
      const reference = data.reservation?.reference as string | undefined;
      toast.success(
        data.reservation?.status === "Confirmed"
          ? `Reservation confirmed · Ref ${reference ?? ""}`.trim()
          : `Request received · Ref ${reference ?? ""}. We'll confirm shortly.`.trim(),
      );
      if (reference) onSuccess?.(reference);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to submit reservation.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="modal-backdrop event-modal-backdrop"
      role="presentation"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        className="booking-modal event-reservation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-reservation-title"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={26} aria-hidden="true" />
        </button>
        <p className="eyebrow">{actionLabel(event.actionType, event.customActionLabel)}</p>
        <h2 id="event-reservation-title">{event.title}</h2>
        <p className="event-modal-subtitle">
          {formatEventDate(event.startAt, { withYear: true, withWeekday: true })} ·{" "}
          {formatEventTimeRange(event.startAt, event.endAt)}
        </p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label>
              Full Name
              <input
                ref={firstFieldRef}
                required
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                autoComplete="name"
              />
            </label>
            <label>
              Guests
              <select
                value={form.guestCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, guestCount: e.target.value }))
                }
              >
                {guestOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                autoComplete="tel"
              />
            </label>
          </div>
          <label>
            Seating Request (optional)
            <input
              value={form.seatingRequest}
              onChange={(e) =>
                setForm((f) => ({ ...f, seatingRequest: e.target.value }))
              }
              placeholder="e.g. Booth, near the stage, quiet corner…"
            />
          </label>
          <label>
            Notes (optional)
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Anything else we should know?"
            />
          </label>
          <label className="event-modal-consent">
            <input
              type="checkbox"
              checked={form.consentAccepted}
              onChange={(e) =>
                setForm((f) => ({ ...f, consentAccepted: e.target.checked }))
              }
            />
            I agree to be contacted by Highbury Lounge regarding this reservation.
          </label>
          <button
            type="submit"
            className="button primary form-submit"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Confirm Reservation"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
