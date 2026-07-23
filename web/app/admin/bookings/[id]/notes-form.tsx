"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
      setMessage("Notes saved.");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-card" onSubmit={onSubmit}>
      <h2>Internal notes</h2>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <p className="page-sub">{message}</p> : null}
      <textarea
        className="admin-textarea"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
      />
      <button className="admin-btn" type="submit" disabled={busy} style={{ marginTop: 10 }}>
        {busy ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
