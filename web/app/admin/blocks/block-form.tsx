"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function BlockForm({ rooms }: { rooms: { id: number; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomTypeId: Number(fd.get("roomTypeId")),
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate"),
        roomsBlocked: Number(fd.get("roomsBlocked") || 1),
        reason: fd.get("reason"),
        adminNote: fd.get("adminNote"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create block");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="admin-card admin-form" onSubmit={onSubmit}>
      <h2>Create block</h2>
      {error && <div className="admin-error">{error}</div>}
      <label>
        Room type
        <select className="admin-input" name="roomTypeId" required>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-form-row">
        <label>
          Start
          <input className="admin-input" type="date" name="startDate" required />
        </label>
        <label>
          End
          <input className="admin-input" type="date" name="endDate" required />
        </label>
        <label>
          Rooms blocked
          <input className="admin-input" type="number" name="roomsBlocked" defaultValue={1} min={1} />
        </label>
      </div>
      <label>
        Reason
        <select className="admin-input" name="reason" required>
          <option>Maintenance</option>
          <option>Private use</option>
          <option>Renovation</option>
          <option>Manual reservation</option>
          <option>Other</option>
        </select>
      </label>
      <label>
        Admin note
        <textarea className="admin-input" name="adminNote" rows={2} />
      </label>
      <button className="admin-btn" type="submit">
        Save block
      </button>
    </form>
  );
}
