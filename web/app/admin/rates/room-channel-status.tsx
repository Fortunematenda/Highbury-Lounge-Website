"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { formatVenueDateTime } from "@/lib/timezone";

export type RoomChannelStatusRow = {
  roomTypeId: number;
  roomName: string;
  effectivePrice: number;
  inventoryCount: number;
  mapped: boolean;
  externalRoomId: string | null;
  channelStatus: "Synced" | "Failed" | "Pending" | "Not mapped" | "Local only";
  lastSyncedAt: string | null;
  lastError: string | null;
  lastMessage: string | null;
};

export function RoomChannelStatusPanel({
  initialRooms,
  beds24Enabled,
}: {
  initialRooms: RoomChannelStatusRow[];
  beds24Enabled: boolean;
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/integrations/beds24/room-sync", {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not refresh status");
    setRooms(data.rooms || []);
  }

  async function retry(roomTypeId: number) {
    setBusyId(roomTypeId);
    try {
      const res = await fetch("/api/admin/integrations/beds24/room-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomTypeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || data.warning || "Retry failed");
      } else if (data.syncStatus === "Synced") {
        toast.success(data.message || "Synced");
      } else {
        toast.message(data.message || data.syncStatus);
      }
      await refresh();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-table-wrap">
      {!beds24Enabled ? (
        <p className="muted" style={{ marginBottom: 12 }}>
          Channel status is informational while Beds24 is disabled. Retry sync
          becomes active after <code>BEDS24_ENABLED=true</code>.
        </p>
      ) : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Rate</th>
            <th>Channel status</th>
            <th>Last synced</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.roomTypeId}>
              <td>
                <strong>{room.roomName}</strong>
                {room.externalRoomId ? (
                  <div className="muted">
                    Beds24 room <code>{room.externalRoomId}</code>
                  </div>
                ) : null}
              </td>
              <td>{formatMoney(room.effectivePrice)} / night</td>
              <td>
                <strong
                  style={{
                    color:
                      room.channelStatus === "Synced"
                        ? "var(--admin-success, #157347)"
                        : room.channelStatus === "Failed"
                          ? "var(--admin-danger, #b42318)"
                          : undefined,
                  }}
                >
                  {room.channelStatus}
                </strong>
                {room.channelStatus === "Failed" && room.lastError ? (
                  <div className="muted">{room.lastError}</div>
                ) : null}
                {room.channelStatus === "Failed" ? (
                  <div className="muted">
                    Booking.com may still have the previous price.
                  </div>
                ) : null}
              </td>
              <td>
                {room.lastSyncedAt
                  ? formatVenueDateTime(room.lastSyncedAt)
                  : "—"}
              </td>
              <td>
                {room.mapped && beds24Enabled ? (
                  <button
                    type="button"
                    className="admin-btn secondary"
                    disabled={busyId === room.roomTypeId}
                    onClick={() => void retry(room.roomTypeId)}
                  >
                    {busyId === room.roomTypeId ? "Retrying…" : "Retry Sync"}
                  </button>
                ) : room.mapped ? null : (
                  <a
                    className="admin-btn ghost"
                    href="/admin/integrations/beds24/mapping"
                  >
                    Map room
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
