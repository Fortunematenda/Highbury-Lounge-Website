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

export function ConferenceStatusForm({
  enquiryId,
  currentStatus,
}: {
  enquiryId: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/conference/${enquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: fd.get("status"),
        quotationAmount: fd.get("quotationAmount")
          ? Number(fd.get("quotationAmount"))
          : null,
        quotationNotes: fd.get("quotationNotes"),
        adminNotes: fd.get("adminNotes"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    router.refresh();
  }

  return (
    <form className="admin-card admin-form" onSubmit={onSubmit}>
      <h2>Update enquiry</h2>
      {error && <div className="admin-error">{error}</div>}
      <label>
        Status
        <select className="admin-input" name="status" defaultValue={currentStatus}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Quotation amount
        <input className="admin-input" name="quotationAmount" type="number" step="0.01" />
      </label>
      <label>
        Quotation notes
        <textarea className="admin-input" name="quotationNotes" rows={3} />
      </label>
      <label>
        Admin notes
        <textarea className="admin-input" name="adminNotes" rows={3} />
      </label>
      <button className="admin-btn" type="submit">Save</button>
    </form>
  );
}
