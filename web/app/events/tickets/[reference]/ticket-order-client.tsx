"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TicketOrderClient({
  reference,
  canPay = true,
}: {
  reference: string;
  canPay?: boolean;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  async function refreshStatus() {
    setChecking(true);
    setError("");
    try {
      await fetch(`/api/events/tickets/${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });
      router.refresh();
    } finally {
      setChecking(false);
    }
  }

  async function payNow() {
    if (paying) return;
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/payments/paynow/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "ticket_order", reference }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start payment");
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl as string;
        return;
      }
      throw new Error("Payment redirect missing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setPaying(false);
    }
  }

  return (
    <div className="event-ticket-client-actions">
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {canPay ? (
        <button
          type="button"
          className="button primary event-ticket-refresh-btn"
          onClick={() => void payNow()}
          disabled={paying}
        >
          {paying ? "Redirecting…" : "Pay online with Paynow"}
        </button>
      ) : null}
      <button
        type="button"
        className="button outline event-ticket-refresh-btn"
        onClick={() => void refreshStatus()}
        disabled={checking}
      >
        {checking ? "Checking…" : "I’ve paid — refresh status"}
      </button>
    </div>
  );
}
