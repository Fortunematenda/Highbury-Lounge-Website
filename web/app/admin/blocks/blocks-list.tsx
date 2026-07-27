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
import { formatDate } from "@/lib/format";

type BlockRow = {
  id: number;
  roomName: string | null;
  startDate: string;
  endDate: string;
  roomsBlocked: number;
  reason: string;
};

export function BlocksList({ blocks }: { blocks: BlockRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function removeBlock(block: BlockRow) {
    if (!window.confirm("Remove this room block?")) return;
    setBusyId(block.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/blocks/${block.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(block: BlockRow) {
    return [
      {
        label: "Delete",
        danger: true,
        disabled: busyId === block.id,
        onClick: () => void removeBlock(block),
      },
    ];
  }

  return (
    <section className="admin-card">
      {error ? <div className="admin-error">{error}</div> : null}
      <div className="admin-desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Dates</th>
              <th>Rooms</th>
              <th>Reason</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr>
                <td colSpan={5}>No blocks yet.</td>
              </tr>
            ) : (
              blocks.map((block) => (
                <AdminClickableRow key={block.id}>
                  <td>{block.roomName}</td>
                  <td>
                    {formatDate(block.startDate)} – {formatDate(block.endDate)}
                  </td>
                  <td>{block.roomsBlocked}</td>
                  <td>{block.reason}</td>
                  <td>
                    <AdminRowActions
                      label={`Actions for block ${block.id}`}
                      actions={actionsFor(block)}
                    />
                  </td>
                </AdminClickableRow>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {blocks.length === 0 ? (
          <p className="admin-muted">No blocks yet.</p>
        ) : (
          blocks.map((block) => (
            <AdminMobileCard
              key={block.id}
              title={block.roomName || `Block #${block.id}`}
              subtitle={block.reason}
              actions={actionsFor(block)}
            >
              <AdminMobileMeta
                items={[
                  {
                    label: "From",
                    value: formatDate(block.startDate),
                  },
                  {
                    label: "To",
                    value: formatDate(block.endDate),
                  },
                  {
                    label: "Rooms blocked",
                    value: block.roomsBlocked,
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
