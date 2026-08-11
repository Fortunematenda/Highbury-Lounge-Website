"use client";

import Link from "next/link";
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
import { StatusBadge } from "@/app/admin/components/detail-page";
import { formatVenueDateTime } from "@/lib/timezone";

export type TicketOrderRow = {
  id: number;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  ticketTypeName: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  eventId: number;
  eventTitle: string | null;
  eventStartAt: string | null;
};

export function TicketOrdersList({ rows }: { rows: TicketOrderRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function onDelete(row: TicketOrderRow) {
    if (
      !window.confirm(
        `Delete ticket order ${row.reference}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/events/tickets/${row.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Ticket order deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(row: TicketOrderRow) {
    return [
      {
        label: "Open",
        href: `/admin/events/tickets/${row.id}`,
      },
      {
        label: "Delete",
        danger: true,
        disabled: busyId === row.id,
        onClick: () => void onDelete(row),
      },
    ];
  }

  if (rows.length === 0) {
    return <p className="admin-empty">No ticket orders yet.</p>;
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
              <th>Tickets</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AdminClickableRow
                key={row.id}
                href={`/admin/events/tickets/${row.id}`}
              >
                <td>
                  <Link href={`/admin/events/tickets/${row.id}`} prefetch={false}>
                    {row.reference}
                  </Link>
                </td>
                <td>
                  <div>{row.fullName}</div>
                  <small className="muted">{row.email}</small>
                </td>
                <td>{row.eventTitle || "—"}</td>
                <td>
                  {row.quantity}× {row.ticketTypeName}
                </td>
                <td>
                  {row.currency} {Number(row.totalAmount).toFixed(2)}
                </td>
                <td>
                  <StatusBadge status={row.paymentStatus} />
                </td>
                <td>{formatVenueDateTime(row.createdAt)}</td>
                <td>
                  <AdminRowActions
                    label={`Actions for ${row.reference}`}
                    actions={actionsFor(row)}
                  />
                </td>
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
            href={`/admin/events/tickets/${row.id}`}
            actions={actionsFor(row)}
          >
            <div style={{ marginBottom: 10 }}>
              <StatusBadge status={row.paymentStatus} />
            </div>
            <AdminMobileMeta
              items={[
                {
                  label: "Tickets",
                  value: `${row.quantity}× ${row.ticketTypeName}`,
                },
                {
                  label: "Amount",
                  value: `${row.currency} ${Number(row.totalAmount).toFixed(2)}`,
                },
                { label: "Event", value: row.eventTitle || "—" },
                { label: "Email", value: row.email },
              ]}
            />
          </AdminMobileCard>
        ))}
      </div>
    </>
  );
}
