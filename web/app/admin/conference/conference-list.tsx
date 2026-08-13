"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { formatDate, statusColor } from "@/lib/format";

type EnquiryRow = {
  id: number;
  reference: string;
  contactName: string;
  email: string;
  preferredDate: string;
  attendees: number;
  status: string;
};

export function ConferenceList({ rows }: { rows: EnquiryRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function onDelete(r: EnquiryRow) {
    if (
      !window.confirm(
        `Delete conference enquiry ${r.reference}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/conference/${r.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete enquiry");
      toast.success("Enquiry deleted");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete enquiry",
      );
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(r: EnquiryRow) {
    return [
      { label: "Edit", href: `/admin/conference/${r.id}` },
      {
        label: "Delete",
        danger: true,
        disabled: busyId === r.id,
        onClick: () => void onDelete(r),
      },
    ];
  }

  return (
    <>
      <div className="admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Contact</th>
              <th>Date</th>
              <th>Attendees</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>No conference enquiries yet.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <AdminClickableRow
                  key={r.id}
                  href={`/admin/conference/${r.id}`}
                >
                  <td>{r.reference}</td>
                  <td>
                    <div>{r.contactName}</div>
                    <div className="admin-muted">{r.email}</div>
                  </td>
                  <td>{formatDate(r.preferredDate)}</td>
                  <td>{r.attendees}</td>
                  <td>
                    <span
                      className="admin-badge"
                      style={{ background: statusColor(r.status) }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <AdminRowActions
                      label={`Actions for ${r.reference}`}
                      actions={actionsFor(r)}
                    />
                  </td>
                </AdminClickableRow>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {rows.length === 0 ? (
          <p className="admin-muted">No conference enquiries yet.</p>
        ) : (
          rows.map((r) => (
            <AdminMobileCard
              key={r.id}
              title={r.reference}
              subtitle={r.contactName}
              href={`/admin/conference/${r.id}`}
              actions={actionsFor(r)}
            >
              <div style={{ marginBottom: 10 }}>
                <span
                  className="admin-badge"
                  style={{ background: statusColor(r.status) }}
                >
                  {r.status}
                </span>
              </div>
              <AdminMobileMeta
                items={[
                  { label: "Date", value: formatDate(r.preferredDate) },
                  { label: "Attendees", value: r.attendees },
                  { label: "Email", value: r.email },
                ]}
              />
            </AdminMobileCard>
          ))
        )}
      </div>
    </>
  );
}
