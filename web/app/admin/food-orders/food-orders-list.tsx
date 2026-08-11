"use client";

import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { formatMoney, statusColor } from "@/lib/format";
import { formatVenueDateTime } from "@/lib/timezone";

type FoodOrderRow = {
  id: number;
  reference: string;
  status: string;
  guestName: string | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  bookingId: number | null;
  bookingReference: string | null;
  bookingStatus: string | null;
  roomName: string | null;
  itemSummary: string;
};

export function FoodOrdersList({ rows }: { rows: FoodOrderRow[] }) {
  function actionsFor(row: FoodOrderRow) {
    const actions = [
      { label: "Open", href: `/admin/food-orders/${row.id}` },
    ];
    if (row.bookingId) {
      actions.push({
        label: "View booking",
        href: `/admin/bookings/${row.bookingId}`,
      });
    }
    return actions;
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
              <th>Ordered items</th>
              <th>Total</th>
              <th>Food status</th>
              <th>Booking</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>No food orders match your filters.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <AdminClickableRow
                  key={row.id}
                  href={`/admin/food-orders/${row.id}`}
                >
                  <td>{row.reference}</td>
                  <td>{row.guestName || "—"}</td>
                  <td>{row.roomName || "—"}</td>
                  <td>{row.itemSummary}</td>
                  <td>{formatMoney(row.totalAmount, row.currency)}</td>
                  <td>
                    <span
                      className="admin-badge"
                      style={{ background: statusColor(row.status) }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>
                    {row.bookingReference ? (
                      <>
                        {row.bookingReference}
                        {row.bookingStatus ? (
                          <div className="admin-muted">{row.bookingStatus}</div>
                        ) : null}
                      </>
                    ) : (
                      "Standalone"
                    )}
                  </td>
                  <td>{formatVenueDateTime(row.createdAt)}</td>
                  <td>
                    <AdminRowActions
                      label={`Actions for ${row.reference}`}
                      actions={actionsFor(row)}
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
          <p className="admin-muted">No food orders match your filters.</p>
        ) : (
          rows.map((row) => (
            <AdminMobileCard
              key={row.id}
              href={`/admin/food-orders/${row.id}`}
              title={row.reference}
              subtitle={row.guestName || "Guest"}
              actions={actionsFor(row)}
            >
              <div style={{ marginBottom: 10 }}>
                <span
                  className="admin-badge"
                  style={{ background: statusColor(row.status) }}
                >
                  {row.status}
                </span>
              </div>
              <AdminMobileMeta
                items={[
                  { label: "Items", value: row.itemSummary },
                  {
                    label: "Total",
                    value: formatMoney(row.totalAmount, row.currency),
                  },
                  { label: "Room", value: row.roomName || "—" },
                  {
                    label: "Booking",
                    value: row.bookingReference || "Standalone",
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
