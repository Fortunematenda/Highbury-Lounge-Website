"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminFormField,
  AdminTextarea,
} from "@/app/admin/components/form-fields";

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
  reference,
  currentStatus,
}: {
  bookingId: number;
  reference: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function applyStatus(status: string) {
    setPending(status);
    setError("");
    setSuccess("");
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
      setSuccess("Saved successfully.");
      window.setTimeout(() => setSuccess(""), 3500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPending(null);
    }
  }

  async function onDelete() {
    if (deleting || pending) return;
    if (
      !window.confirm(
        `Delete booking ${reference}? This permanently removes the booking, guest, payments, and linked food orders. This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete booking");
      router.push("/admin/bookings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete booking");
      setDeleting(false);
    }
  }

  function onAsk(event: FormEvent, status: string) {
    event.preventDefault();
    setConfirmStatus(status);
  }

  return (
    <div className="detail-inline-form">
      <p className="page-sub detail-inline-hint">Current status: {currentStatus}</p>
      {error ? (
        <div className="admin-error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="admin-success" role="status">
          {success}
        </div>
      ) : null}
      <AdminFormField label="Additional notes" hint="Optional note saved with the status change.">
        <AdminTextarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason or follow-up note…"
        />
      </AdminFormField>
      <div className="admin-action-grid">
        {ACTIONS.filter((s) => s !== currentStatus).map((status) => (
          <form key={status} onSubmit={(e) => onAsk(e, status)}>
            <button
              className="admin-btn secondary"
              type="submit"
              disabled={!!pending || deleting}
            >
              Mark as {status}
            </button>
          </form>
        ))}
      </div>
      <div className="detail-inline-actions">
        <button
          type="button"
          className="admin-btn danger"
          disabled={!!pending || deleting}
          onClick={() => void onDelete()}
        >
          {deleting ? "Deleting…" : "Delete booking"}
        </button>
      </div>

      {confirmStatus ? (
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
      ) : null}
    </div>
  );
}
