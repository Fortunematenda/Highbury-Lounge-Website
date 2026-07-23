"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  "New Enquiry",
  "Contacted",
  "Quotation Sent",
  "Awaiting Approval",
  "Approved",
  "Confirmed",
  "Declined",
  "Cancelled",
  "Completed",
];

export function ConferenceUpdateForm({
  enquiryId,
  initial,
}: {
  enquiryId: number;
  initial: {
    status: string;
    adminNotes: string;
    quotationAmount: string;
    quotationNotes: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/conference/${enquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: fd.get("status"),
        adminNotes: fd.get("adminNotes"),
        quotationAmount: fd.get("quotationAmount") || null,
        quotationNotes: fd.get("quotationNotes"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <p className="admin-muted">{message}</p> : null}
      <label>
        Status
        <select
          className="admin-select"
          name="status"
          defaultValue={initial.status}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quotation amount
        <input
          className="admin-input"
          name="quotationAmount"
          type="number"
          step="0.01"
          defaultValue={initial.quotationAmount}
        />
      </label>
      <label>
        Quotation notes
        <textarea
          className="admin-textarea"
          name="quotationNotes"
          defaultValue={initial.quotationNotes}
        />
      </label>
      <label>
        Admin notes
        <textarea
          className="admin-textarea"
          name="adminNotes"
          defaultValue={initial.adminNotes}
        />
      </label>
      <button className="admin-btn" type="submit">
        Save updates
      </button>
    </form>
  );
}
