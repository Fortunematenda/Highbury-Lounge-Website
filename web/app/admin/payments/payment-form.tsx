"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentForm({
  bookings,
}: {
  bookings: {
    id: number;
    reference: string;
    totalAmount?: number;
    currency?: string;
    paymentStatus?: string;
  }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: Number(fd.get("bookingId")),
        amount: Number(fd.get("amount")),
        currency: fd.get("currency") || "USD",
        method: fd.get("method"),
        status: fd.get("status") || "Paid",
        transactionReference: fd.get("transactionReference") || undefined,
        paymentDate:
          fd.get("paymentDate") || new Date().toISOString().slice(0, 10),
        adminNote: fd.get("adminNote") || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not record payment.");
      return;
    }
    setOk(true);
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="admin-card admin-form" onSubmit={onSubmit}>
      <h2>Record payment</h2>
      {error ? <div className="admin-error">{error}</div> : null}
      {ok ? <p className="admin-muted">Payment recorded.</p> : null}
      <label>
        Booking
        <select className="admin-select" name="bookingId" required>
          <option value="">Select…</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.reference}
              {b.totalAmount != null
                ? ` · ${b.totalAmount} ${b.currency ?? "USD"}`
                : ""}
              {b.paymentStatus ? ` (${b.paymentStatus})` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-form-row">
        <label>
          Amount
          <input
            className="admin-input"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </label>
        <label>
          Currency
          <input className="admin-input" name="currency" defaultValue="USD" />
        </label>
      </div>
      <div className="admin-form-row">
        <label>
          Method
          <select className="admin-select" name="method" required>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="EcoCash">EcoCash</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          Status
          <select className="admin-select" name="status" defaultValue="Paid">
            <option value="Paid">Paid</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>
        </label>
      </div>
      <div className="admin-form-row">
        <label>
          Payment date
          <input className="admin-input" type="date" name="paymentDate" />
        </label>
        <label>
          Reference
          <input className="admin-input" name="transactionReference" />
        </label>
      </div>
      <label>
        Note
        <textarea className="admin-textarea" name="adminNote" />
      </label>
      <button className="admin-btn" type="submit">
        Record payment
      </button>
    </form>
  );
}
