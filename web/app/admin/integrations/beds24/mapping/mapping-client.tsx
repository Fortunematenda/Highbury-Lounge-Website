"use client";

import { useState } from "react";
import { toast } from "sonner";

export type MappingRow = {
  localRoomTypeId: number;
  localRoomName: string;
  isActive: boolean;
  mappingId: number | null;
  externalPropertyId: string;
  externalRoomId: string;
  externalRoomName: string;
  externalRatePlanId: string;
  enabled: boolean;
  status: string;
};

export function Beds24MappingClient({
  defaultPropertyId,
  initialRows,
}: {
  defaultPropertyId: string;
  initialRows: MappingRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<number | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/integrations/beds24/mappings", {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load mappings");
    setRows(data.rooms || []);
  }

  function updateRow(id: number, patch: Partial<MappingRow>) {
    setRows((prev) =>
      prev.map((r) => (r.localRoomTypeId === id ? { ...r, ...patch } : r)),
    );
  }

  async function save(row: MappingRow) {
    setBusy(row.localRoomTypeId);
    try {
      const res = await fetch("/api/admin/integrations/beds24/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localRoomTypeId: row.localRoomTypeId,
          externalPropertyId:
            row.externalPropertyId || defaultPropertyId || undefined,
          externalRoomId: row.externalRoomId,
          externalRoomName: row.externalRoomName,
          externalRatePlanId: row.externalRatePlanId,
          enabled: row.enabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(`Saved mapping for ${row.localRoomName}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Highbury room type</th>
            <th>Beds24 room name</th>
            <th>External room ID</th>
            <th>Rate plan ID</th>
            <th>Status</th>
            <th>Enabled</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="muted">
                No room types yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.localRoomTypeId}>
                <td>
                  <strong>{row.localRoomName}</strong>
                  {!row.isActive ? (
                    <span className="muted"> · inactive</span>
                  ) : null}
                </td>
                <td>
                  <input
                    className="admin-input"
                    value={row.externalRoomName}
                    onChange={(e) =>
                      updateRow(row.localRoomTypeId, {
                        externalRoomName: e.target.value,
                      })
                    }
                    placeholder="Optional label"
                  />
                </td>
                <td>
                  <input
                    className="admin-input"
                    value={row.externalRoomId}
                    onChange={(e) =>
                      updateRow(row.localRoomTypeId, {
                        externalRoomId: e.target.value,
                        status: e.target.value ? "Mapped" : "Not Mapped",
                      })
                    }
                    placeholder="Beds24 room id"
                  />
                </td>
                <td>
                  <input
                    className="admin-input"
                    value={row.externalRatePlanId}
                    onChange={(e) =>
                      updateRow(row.localRoomTypeId, {
                        externalRatePlanId: e.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </td>
                <td>{row.status}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      updateRow(row.localRoomTypeId, {
                        enabled: e.target.checked,
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={busy === row.localRoomTypeId}
                    onClick={() => void save(row)}
                  >
                    {busy === row.localRoomTypeId ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="muted" style={{ marginTop: 12 }}>
        Leave External room ID blank and save to clear a mapping. Live sync will
        refuse unmapped rooms.
      </p>
    </div>
  );
}
