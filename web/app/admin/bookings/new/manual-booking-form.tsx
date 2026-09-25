"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type RoomOption = { id: number; name: string };

export function ManualBookingForm({ rooms }: { rooms: RoomOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: Number(fd.get("roomTypeId")),
          checkIn: String(fd.get("checkIn") || ""),
          checkOut: String(fd.get("checkOut") || ""),
          adults: Number(fd.get("adults") || 1),
          children: Number(fd.get("children") || 0),
          roomsBooked: Number(fd.get("roomsBooked") || 1),
          firstName: String(fd.get("firstName") || ""),
          lastName: String(fd.get("lastName") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          specialRequests: String(fd.get("specialRequests") || ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create booking");
      toast.success(`Manual booking ${data.booking.reference} created`);
      router.push(`/admin/bookings/${data.booking.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit} style={{ maxWidth: 640 }}>
      <label className="admin-label">
        Room
        <select className="admin-input" name="roomTypeId" required>
          <option value="">Select room</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-form-row">
        <label className="admin-label">
          Check-in
          <input className="admin-input" type="date" name="checkIn" required />
        </label>
        <label className="admin-label">
          Check-out
          <input className="admin-input" type="date" name="checkOut" required />
        </label>
      </div>
      <div className="admin-form-row">
        <label className="admin-label">
          Adults
          <input
            className="admin-input"
            type="number"
            name="adults"
            min={1}
            defaultValue={1}
            required
          />
        </label>
        <label className="admin-label">
          Children
          <input
            className="admin-input"
            type="number"
            name="children"
            min={0}
            defaultValue={0}
          />
        </label>
        <label className="admin-label">
          Rooms
          <input
            className="admin-input"
            type="number"
            name="roomsBooked"
            min={1}
            defaultValue={1}
          />
        </label>
      </div>
      <div className="admin-form-row">
        <label className="admin-label">
          First name
          <input className="admin-input" name="firstName" required />
        </label>
        <label className="admin-label">
          Last name
          <input className="admin-input" name="lastName" required />
        </label>
      </div>
      <div className="admin-form-row">
        <label className="admin-label">
          Email
          <input className="admin-input" type="email" name="email" required />
        </label>
        <label className="admin-label">
          Phone
          <input className="admin-input" name="phone" required />
        </label>
      </div>
      <label className="admin-label">
        Notes
        <textarea className="admin-input" name="specialRequests" rows={3} />
      </label>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button className="admin-btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Create manual booking"}
        </button>
        <Link className="admin-btn admin-btn-ghost" href="/admin/bookings">
          Cancel
        </Link>
      </div>
    </form>
  );
}
