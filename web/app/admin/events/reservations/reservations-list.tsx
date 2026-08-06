"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminClickableRow } from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { RESERVATION_STATUSES } from "@/lib/event-constants";
import { formatDate } from "@/lib/format";

export type ReservationRow = {
  id: number;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  guestCount: number;
  status: string;
  reservationType: string | null;
  createdAt: string;
  eventId: number | null;
  eventTitle: string | null;
  eventSlug: string | null;
  eventStartAt: string | null;
};

export function ReservationsList({ rows }: { rows: ReservationRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function setStatus(row: ReservationRow, status: string) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/events/reservations/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update reservation");
      toast.success(`Marked as ${status}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update reservation",
      );
    } finally {
      setBusyId(null);
    }
  }

  function onStatusChange(row: ReservationRow, value: string) {
    if (!RESERVATION_STATUSES.includes(value as (typeof RESERVATION_STATUSES)[number])) return;
    if (value === row.status) return;
    setStatus(row, value);
  }

  if (rows.length === 0) {
    return <p className="admin-muted">No reservations match your filters.</p>;
  }

  return (
    <>
      <div className="admin-table-wrap admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Guest</th>
              <th>Event</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Submitted</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AdminClickableRow
                key={row.id}
                href={`/admin/events/reservations/${row.id}`}
              >
                <td>{row.reference}</td>
                <td>
                  <div>{row.fullName}</div>
                  <div className="admin-muted">{row.email}</div>
                </td>
                <td>
                  {row.eventTitle ? (
                    <>
                      <div>{row.eventTitle}</div>
                      {row.eventStartAt ? (
                        <div className="admin-muted">
                          {formatDate(row.eventStartAt.slice(0, 10))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{row.guestCount}</td>
                <td>
                  <select
                    className="admin-input"
                    value={row.status}
                    disabled={busyId === row.id}
                    onChange={(e) => onStatusChange(row, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ minWidth: 120, width: "auto" }}
                  >
                    {RESERVATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{formatDate(row.createdAt.slice(0, 10))}</td>
                <td aria-label="Actions" />
              </AdminClickableRow>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {rows.map((row) => (
          <AdminMobileCard
            key={row.id}
            title={row.reference}
            subtitle={row.fullName}
            href={`/admin/events/reservations/${row.id}`}
          >
            <div style={{ marginBottom: 10 }}>
              <select
                className="admin-input"
                value={row.status}
                disabled={busyId === row.id}
                onChange={(e) => onStatusChange(row, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%" }}
              >
                {RESERVATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <AdminMobileMeta
              items={[
                { label: "Event", value: row.eventTitle || "—" },
                { label: "Guests", value: row.guestCount },
                { label: "Email", value: row.email },
                { label: "Phone", value: row.phone },
                {
                  label: "Submitted",
                  value: formatDate(row.createdAt.slice(0, 10)),
                },
              ]}
            />
          </AdminMobileCard>
        ))}
      </div>
    </>
  );
}
