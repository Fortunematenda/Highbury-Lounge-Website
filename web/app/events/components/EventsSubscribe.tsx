"use client";

import { useState, type FormEvent } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

type Props = {
  className?: string;
};

export function EventsSubscribe({ className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/events/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "events_page" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to subscribe right now.");
      }
      toast.success(data.message || "You're subscribed.");
      setEmail("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to subscribe right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={["events-subscribe", className].filter(Boolean).join(" ")}>
      <div className="events-subscribe-copy">
        <p className="eyebrow light">STAY IN THE LOOP</p>
        <h2>Never miss a night at Highbury</h2>
        <p>
          Subscribe for first access to new events, guest lists and
          limited-capacity evenings before they&apos;re announced.
        </p>
      </div>
      <form className="events-subscribe-form" onSubmit={onSubmit}>
        <label className="events-subscribe-field">
          <Mail size={18} aria-hidden="true" />
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Email address"
            autoComplete="email"
          />
        </label>
        <button type="submit" className="button primary" disabled={submitting}>
          {submitting ? "Subscribing…" : "Subscribe"}
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
