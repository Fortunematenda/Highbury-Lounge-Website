"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AdminClickableRow,
  AdminRowActions,
  type AdminRowAction,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { PmsStatusPill } from "@/app/admin/components/pms";
import { formatEntryPrice } from "@/lib/event-constants";
import { formatMoney } from "@/lib/format";
import {
  formatEventDate,
  formatEventTime,
  formatEventTimeRange,
} from "@/app/events/lib";

export type EventRow = {
  id: number;
  title: string;
  slug: string;
  category: string;
  startAt: string;
  endAt: string | null;
  status: string;
  isFeatured: boolean;
  coverImage: string | null;
  posterImage: string | null;
  capacity: number | null;
  trackCapacity: boolean;
  soldOutOverride: boolean;
  entryType: string;
  price: number | null;
  currency: string;
  reservationCount: number;
};

const STATUS_TONE: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  draft: "neutral",
  scheduled: "info",
  published: "success",
  postponed: "warning",
  cancelled: "danger",
  completed: "neutral",
};

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatEventWhen(startAt: string, endAt: string | null) {
  if (!startAt) return "—";
  const date = formatEventDate(startAt, { withYear: true });
  if (!endAt) return `${date} · ${formatEventTime(startAt)}`;
  return `${date} · ${formatEventTimeRange(startAt, endAt)}`;
}

export function EventsList({ rows }: { rows: EventRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const visibleRows = rows.filter((row) => !hiddenIds.includes(row.id));

  async function patchEvent(
    id: number,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update event");
      toast.success(successMessage);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update event");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(row: EventRow) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/events/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not duplicate event");
      toast.success(`Duplicated “${row.title}”`);
      router.push(`/admin/events/${data.event.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate event");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: EventRow) {
    const ok = window.confirm(
      `Delete “${row.title}”? This will remove it from the website. This cannot be undone.`,
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/events/${row.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete event");
      setHiddenIds((ids) => [...ids, row.id]);
      toast.success(`Deleted “${row.title}”`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete event");
    } finally {
      setBusyId(null);
    }
  }

  function cancelEvent(row: EventRow) {
    const ok = window.confirm(`Cancel “${row.title}”? Guests will see it as cancelled.`);
    if (!ok) return;
    void patchEvent(row.id, { status: "cancelled" }, "Event cancelled");
  }

  function actionsFor(row: EventRow): AdminRowAction[] {
    const busy = busyId === row.id;
    const actions: AdminRowAction[] = [
      { label: "Edit", href: `/admin/events/${row.id}` },
      { label: "Duplicate", disabled: busy, onClick: () => void duplicate(row) },
      {
        label: row.status === "published" ? "Unpublish" : "Publish",
        disabled: busy,
        onClick: () =>
          void patchEvent(
            row.id,
            { status: row.status === "published" ? "draft" : "published" },
            row.status === "published" ? "Event unpublished" : "Event published",
          ),
      },
      {
        label: row.isFeatured ? "Remove from featured" : "Mark as featured",
        disabled: busy,
        onClick: () =>
          void patchEvent(
            row.id,
            { isFeatured: !row.isFeatured },
            row.isFeatured ? "Removed from featured" : "Marked as featured",
          ),
      },
      {
        label: "View public page",
        onClick: () =>
          window.open(`/events/${row.slug}`, "_blank", "noopener,noreferrer"),
      },
    ];
    if (row.status !== "cancelled") {
      actions.push({
        label: "Cancel event",
        danger: true,
        disabled: busy,
        onClick: () => cancelEvent(row),
      });
    }
    actions.push({
      label: "Delete",
      danger: true,
      disabled: busy,
      onClick: () => void remove(row),
    });
    return actions;
  }

  function entryLabel(row: EventRow) {
    return formatEntryPrice({
      entryType: row.entryType,
      price: row.price,
      currency: row.currency,
      formatMoney,
    });
  }

  function capacityLabel(row: EventRow) {
    if (row.soldOutOverride) return "Sold out";
    if (!row.trackCapacity) return "Unlimited";
    return row.capacity != null ? `${row.capacity} capacity` : "—";
  }

  if (visibleRows.length === 0) {
    return <p className="admin-muted">No events match your filters.</p>;
  }

  return (
    <>
      <div className="admin-table-wrap admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Category</th>
              <th>When</th>
              <th>Status</th>
              <th>Entry</th>
              <th>Capacity</th>
              <th>Reservations</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <AdminClickableRow key={row.id} href={`/admin/events/${row.id}`}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {row.coverImage || row.posterImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.coverImage || row.posterImage || ""}
                        alt=""
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div>
                      <strong>{row.title}</strong>
                      {row.isFeatured ? (
                        <div>
                          <PmsStatusPill label="Featured" tone="info" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td>{row.category}</td>
                <td>{formatEventWhen(row.startAt, row.endAt)}</td>
                <td>
                  <PmsStatusPill
                    label={statusLabel(row.status)}
                    tone={STATUS_TONE[row.status] ?? "neutral"}
                  />
                </td>
                <td>{entryLabel(row)}</td>
                <td>{capacityLabel(row)}</td>
                <td>
                  <Link href={`/admin/events/reservations?eventId=${row.id}`} prefetch={false}>
                    {row.reservationCount}
                  </Link>
                </td>
                <td>
                  <AdminRowActions
                    label={`Actions for ${row.title}`}
                    actions={actionsFor(row)}
                  />
                </td>
              </AdminClickableRow>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {visibleRows.map((row) => (
          <AdminMobileCard
            key={row.id}
            title={row.title}
            subtitle={row.category}
            href={`/admin/events/${row.id}`}
            actions={actionsFor(row)}
          >
            <div style={{ marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PmsStatusPill
                label={statusLabel(row.status)}
                tone={STATUS_TONE[row.status] ?? "neutral"}
              />
              {row.isFeatured ? <PmsStatusPill label="Featured" tone="info" /> : null}
            </div>
            <AdminMobileMeta
              items={[
                { label: "When", value: formatEventWhen(row.startAt, row.endAt) },
                { label: "Entry", value: entryLabel(row) },
                { label: "Capacity", value: capacityLabel(row) },
                { label: "Reservations", value: row.reservationCount },
              ]}
            />
          </AdminMobileCard>
        ))}
      </div>
    </>
  );
}
