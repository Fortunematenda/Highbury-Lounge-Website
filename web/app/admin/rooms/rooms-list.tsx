"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminClickableRow,
  AdminRowActions,
} from "@/app/admin/components/AdminRowActions";
import {
  AdminMobileCard,
  AdminMobileMeta,
} from "@/app/admin/components/AdminMobileCard";
import { formatMoney } from "@/lib/format";

type RoomRow = {
  id: number;
  name: string;
  pricePerNight: number;
  promotionalPrice: number | null;
  inventoryCount: number;
  maxGuests: number;
  isActive: boolean;
};

export function RoomsList({ rooms }: { rooms: RoomRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function removeRoom(room: RoomRow) {
    const ok = window.confirm(
      `Remove “${room.name}”? If it has bookings it will be deactivated instead.`,
    );
    if (!ok) return;
    setBusyId(room.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove room");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove room");
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(r: RoomRow) {
    return [
      { label: "Edit", href: `/admin/rooms/${r.id}` },
      {
        label: "Delete",
        danger: true,
        disabled: busyId === r.id,
        onClick: () => void removeRoom(r),
      },
    ];
  }

  return (
    <section className="admin-card">
      {error ? <div className="admin-error">{error}</div> : null}
      <div className="admin-table-wrap admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Inventory</th>
              <th>Max guests</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={6}>No rooms yet.</td>
              </tr>
            ) : (
              rooms.map((r) => (
                <AdminClickableRow key={r.id} href={`/admin/rooms/${r.id}`}>
                  <td>{r.name}</td>
                  <td>
                    {formatMoney(r.promotionalPrice ?? r.pricePerNight)}
                    {r.promotionalPrice ? (
                      <small> (list {formatMoney(r.pricePerNight)})</small>
                    ) : null}
                  </td>
                  <td>{r.inventoryCount}</td>
                  <td>{r.maxGuests}</td>
                  <td>{r.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <AdminRowActions
                      label={`Actions for ${r.name}`}
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
        {rooms.length === 0 ? (
          <p className="admin-muted">No rooms yet.</p>
        ) : (
          rooms.map((r) => (
            <AdminMobileCard
              key={r.id}
              title={r.name}
              subtitle={r.isActive ? "Active" : "Inactive"}
              href={`/admin/rooms/${r.id}`}
              actions={actionsFor(r)}
            >
              <AdminMobileMeta
                items={[
                  {
                    label: "Price",
                    value: formatMoney(r.promotionalPrice ?? r.pricePerNight),
                  },
                  { label: "Inventory", value: r.inventoryCount },
                  { label: "Max guests", value: r.maxGuests },
                  {
                    label: "List price",
                    value: formatMoney(r.pricePerNight),
                  },
                ]}
              />
            </AdminMobileCard>
          ))
        )}
      </div>
    </section>
  );
}
