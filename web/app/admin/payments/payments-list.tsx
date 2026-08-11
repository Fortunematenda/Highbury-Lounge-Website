"use client";

import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { formatVenueDateTime } from "@/lib/timezone";

type PaymentRow = {
  id: number;
  bookingId: number;
  reference: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionReference: string | null;
  paymentDate: string | null;
  createdAt: string;
};

export function PaymentsList({ rows }: { rows: PaymentRow[] }) {
  function actionsFor(p: PaymentRow) {
    return [
      {
        label: "Open booking",
        href: `/admin/bookings/${p.bookingId}`,
      },
    ];
  }

  return (
    <>
      <div className="admin-table-wrap admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Booking</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-muted">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <AdminClickableRow
                  key={p.id}
                  href={`/admin/bookings/${p.bookingId}`}
                >
                  <td>
                    {p.paymentDate
                      ? formatDate(p.paymentDate)
                      : formatVenueDateTime(String(p.createdAt))}
                  </td>
                  <td>
                    {p.reference}
                    {p.transactionReference ? (
                      <div className="admin-muted">{p.transactionReference}</div>
                    ) : null}
                  </td>
                  <td>{formatMoney(p.amount, p.currency)}</td>
                  <td>{p.method}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <AdminRowActions
                      label={`Actions for payment ${p.id}`}
                      actions={actionsFor(p)}
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
          <p className="admin-muted">No payments recorded yet.</p>
        ) : (
          rows.map((p) => (
            <AdminMobileCard
              key={p.id}
              title={p.reference}
              subtitle={p.method}
              href={`/admin/bookings/${p.bookingId}`}
              actions={actionsFor(p)}
            >
              <div style={{ marginBottom: 10 }}>
                <StatusBadge status={p.status} />
              </div>
              <AdminMobileMeta
                items={[
                  {
                    label: "Amount",
                    value: formatMoney(p.amount, p.currency),
                  },
                  {
                    label: "Date",
                    value: p.paymentDate
                      ? formatDate(p.paymentDate)
                      : formatVenueDateTime(String(p.createdAt)),
                  },
                  {
                    label: "Reference",
                    value: p.transactionReference || "—",
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
