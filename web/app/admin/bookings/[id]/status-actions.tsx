"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS = [
  "Confirmed",
  "Declined",
  "Awaiting Payment",
  "Checked In",
  "Checked Out",
  "Cancelled",
  "No Show",
] as const;

export function BookingStatusActions({
  bookingId,
  currentStatus,
}: {
  bookingId: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  async function applyStatus(status: string) {
    setPending(status);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setConfirmStatus(null);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPending(null);
    }
  }

  function onAsk(event: FormEvent, status: string) {
    event.preventDefault();
    setConfirmStatus(status);
  }

  return (
    <div className="admin-card">
      <h2>Status actions</h2>
      <p className="page-sub">Current: {currentStatus}</p>
      {error && <div className="admin-error">{error}</div>}
      <label>
        Admin note (optional)
        <textarea
          className="admin-input"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="admin-action-grid">
        {ACTIONS.filter((s) => s !== currentStatus).map((status) => (
          <form key={status} onSubmit={(e) => onAsk(e, status)}>
            <button className="admin-btn secondary" type="submit" disabled={!!pending}>
              Mark as {status}
            </button>
          </form>
        ))}
      </div>

      {confirmStatus && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <h3>Confirm status change</h3>
            <p>
              Change booking status to <strong>{confirmStatus}</strong>?
            </p>
            <div className="admin-quick-actions">
              <button
                className="admin-btn"
                type="button"
                disabled={!!pending}
                onClick={() => void applyStatus(confirmStatus)}
              >
                {pending ? "Saving…" : "Confirm"}
              </button>
              <button
                className="admin-btn secondary"
                type="button"
                onClick={() => setConfirmStatus(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
