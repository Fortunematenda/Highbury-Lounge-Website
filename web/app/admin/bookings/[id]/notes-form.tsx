"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminFormField,
  AdminTextarea,
} from "@/app/admin/components/form-fields";

export function BookingNotesForm({
  bookingId,
  initialNotes,
}: {
  bookingId: number;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      setMessage("Saved successfully.");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="detail-inline-form" onSubmit={onSubmit}>
      {error ? (
        <div className="admin-error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="admin-success" role="status">
          {message}
        </div>
      ) : null}
      <AdminFormField
        label="Additional notes"
        hint="Visible only to staff. Keep operational notes short and clear."
      >
        <AdminTextarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Add internal notes about this booking…"
        />
      </AdminFormField>
      <div className="detail-inline-actions">
        <button className="admin-btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save notes"}
        </button>
      </div>
    </form>
  );
}
