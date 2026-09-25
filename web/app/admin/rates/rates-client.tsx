"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

type RoomOption = { id: number; name: string };

export function RatesAvailabilityClient({ rooms }: { rooms: RoomOption[] }) {
  const [roomTypeId, setRoomTypeId] = useState(String(rooms[0]?.id ?? ""));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [price, setPrice] = useState("");
  const [minStay, setMinStay] = useState("");
  const [available, setAvailable] = useState("");
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastStatus, setLastStatus] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setLastStatus("Pending");
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: Number(roomTypeId),
          from,
          to,
          price: price === "" ? undefined : Number(price),
          minStay: minStay === "" ? undefined : Number(minStay),
          available: available === "" ? undefined : Number(available),
          closed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLastStatus("Failed");
        throw new Error(data.error || "Update failed");
      }
      setLastStatus(
        data.syncStatus === "Synced"
          ? "Synced"
          : data.syncStatus === "local_only"
            ? "Saved locally"
            : String(data.syncStatus || "Success"),
      );
      toast.success(
        data.syncStatus === "Synced"
          ? "Synced to Beds24 (Booking.com should update via the channel)"
          : data.message || "Rates updated",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <label>
        Room type
        <select
          className="admin-input"
          value={roomTypeId}
          onChange={(e) => setRoomTypeId(e.target.value)}
          required
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-form-row">
        <label>
          From
          <input
            className="admin-input"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </label>
        <label>
          To
          <input
            className="admin-input"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="admin-form-row">
        <label>
          Price / night
          <input
            className="admin-input"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label>
          Minimum stay
          <input
            className="admin-input"
            type="number"
            min="1"
            step="1"
            value={minStay}
            onChange={(e) => setMinStay(e.target.value)}
          />
        </label>
        <label>
          Availability
          <input
            className="admin-input"
            type="number"
            min="0"
            step="1"
            value={available}
            onChange={(e) => setAvailable(e.target.value)}
          />
        </label>
      </div>
      <label className="admin-checkbox">
        <input
          type="checkbox"
          checked={closed}
          onChange={(e) => setClosed(e.target.checked)}
        />
        Closed / stop sell
      </label>
      <p className="muted">
        Sync status: <strong>{lastStatus || "—"}</strong>
      </p>
      <button className="admin-btn" type="submit" disabled={busy || !rooms.length}>
        {busy ? "Synchronising…" : "Save rates"}
      </button>
    </form>
  );
}
