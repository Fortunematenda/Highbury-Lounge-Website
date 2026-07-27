"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminFormField,
  AdminSelect,
  AdminTextInput,
  AdminTextarea,
} from "@/app/admin/components/form-fields";
import { DetailFieldGrid } from "@/app/admin/components/detail-page";

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
  initialQuotationAmount,
  initialQuotationNotes,
  initialAdminNotes,
}: {
  enquiryId: number;
  currentStatus: string;
  initialQuotationAmount?: number | null;
  initialQuotationNotes?: string | null;
  initialAdminNotes?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
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
      setSuccess("Saved successfully.");
      window.setTimeout(() => setSuccess(""), 3500);
      router.refresh();
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
      {success ? (
        <div className="admin-success" role="status">
          {success}
        </div>
      ) : null}
      <DetailFieldGrid columns={2}>
        <AdminFormField label="Status" required>
          <AdminSelect name="status" defaultValue={currentStatus}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </AdminSelect>
        </AdminFormField>
        <AdminFormField label="Quotation amount">
          <AdminTextInput
            name="quotationAmount"
            type="number"
            step="0.01"
            defaultValue={
              initialQuotationAmount != null ? String(initialQuotationAmount) : ""
            }
          />
        </AdminFormField>
        <AdminFormField label="Quotation notes">
          <AdminTextarea
            name="quotationNotes"
            rows={4}
            defaultValue={initialQuotationNotes ?? ""}
            placeholder="Notes included with the quotation…"
          />
        </AdminFormField>
        <AdminFormField label="Additional notes">
          <AdminTextarea
            name="adminNotes"
            rows={4}
            defaultValue={initialAdminNotes ?? ""}
            placeholder="Internal staff notes…"
          />
        </AdminFormField>
      </DetailFieldGrid>
      <div className="detail-inline-actions">
        <button className="admin-btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
