"use client";

import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { formatDate, formatMoney, statusColor } from "@/lib/format";

type RecentBooking = {
  id: number;
  reference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  currency: string;
  roomName: string | null;
  firstName: string | null;
  lastName: string | null;
};

export function RecentBookingsList({ rows }: { rows: RecentBooking[] }) {
  function actionsFor(b: RecentBooking) {
    return [
      { label: "Open", href: `/admin/bookings/${b.id}` },
      { label: "Edit", href: `/admin/bookings/${b.id}` },
    ];
  }

  return (
    <>
      <div className="admin-table-wrap admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Dates</th>
              <th>Total</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>No bookings yet.</td>
              </tr>
            ) : (
              rows.map((b) => (
                <AdminClickableRow key={b.id} href={`/admin/bookings/${b.id}`}>
                  <td>{b.reference}</td>
                  <td>
                    {b.firstName} {b.lastName}
                  </td>
                  <td>{b.roomName}</td>
                  <td>
                    {formatDate(b.checkIn)} – {formatDate(b.checkOut)}
                  </td>
                  <td>{formatMoney(b.totalAmount, b.currency)}</td>
                  <td>
                    <span
                      className="admin-badge"
                      style={{ background: statusColor(b.status) }}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <AdminRowActions
                      label={`Actions for ${b.reference}`}
                      actions={actionsFor(b)}
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
          <p className="admin-muted">No bookings yet.</p>
        ) : (
          rows.map((b) => (
            <AdminMobileCard
              key={b.id}
              title={b.reference}
              subtitle={`${b.firstName ?? ""} ${b.lastName ?? ""}`.trim()}
              href={`/admin/bookings/${b.id}`}
              actions={actionsFor(b)}
            >
              <div style={{ marginBottom: 10 }}>
                <span
                  className="admin-badge"
                  style={{ background: statusColor(b.status) }}
                >
                  {b.status}
                </span>
              </div>
              <AdminMobileMeta
                items={[
                  { label: "Room", value: b.roomName || "—" },
                  {
                    label: "Total",
                    value: formatMoney(b.totalAmount, b.currency),
                  },
                  {
                    label: "Stay",
                    value: `${formatDate(b.checkIn)} – ${formatDate(b.checkOut)}`,
                  },
                ]}
              />
            </AdminMobileCard>
          ))
        )}
      </div>
    </>
  );
}
