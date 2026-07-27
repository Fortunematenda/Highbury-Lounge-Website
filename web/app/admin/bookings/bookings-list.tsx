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

type BookingRow = {
  id: number;
  reference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  roomName: string | null;
  firstName: string | null;
  lastName: string | null;
};

export function BookingsList({ rows }: { rows: BookingRow[] }) {
  function actionsFor(b: BookingRow) {
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
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Guests</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10}>No bookings match your filters.</td>
              </tr>
            ) : (
              rows.map((b) => (
                <AdminClickableRow key={b.id} href={`/admin/bookings/${b.id}`}>
                  <td>{b.reference}</td>
                  <td>
                    {b.firstName} {b.lastName}
                  </td>
                  <td>{b.roomName}</td>
                  <td>{formatDate(b.checkIn)}</td>
                  <td>{formatDate(b.checkOut)}</td>
                  <td>
                    {b.adults}+{b.children}
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
                  <td>{formatDate(b.createdAt.slice(0, 10))}</td>
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
          <p className="admin-muted">No bookings match your filters.</p>
        ) : (
          rows.map((b) => (
            <AdminMobileCard
              key={b.id}
              title={b.reference}
              subtitle={`${b.firstName ?? ""} ${b.lastName ?? ""}`.trim() || "Guest"}
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
                  { label: "Check-in", value: formatDate(b.checkIn) },
                  { label: "Check-out", value: formatDate(b.checkOut) },
                  {
                    label: "Guests",
                    value: `${b.adults}+${b.children}`,
                  },
                  {
                    label: "Created",
                    value: formatDate(b.createdAt.slice(0, 10)),
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
