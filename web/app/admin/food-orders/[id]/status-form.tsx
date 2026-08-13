"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FOOD_ORDER_STATUSES } from "@/lib/food-order-status";
import { confirmDialog } from "@/app/admin/components/confirm-dialog";

export function FoodOrderStatusForm({
  foodOrderId,
  reference,
  currentStatus,
}: {
  foodOrderId: number;
  reference: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/food-orders/${foodOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update status");
      setMessage(`Status updated to ${status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (saving) return;
    if (
      !(await confirmDialog(
        `Delete food order ${reference}? This cannot be undone.`,
      ))
    ) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/food-orders/${foodOrderId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete food order");
      router.push("/admin/food-orders");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete food order",
      );
      setSaving(false);
    }
  }

  return (
    <div className="admin-inline-form">
      <label className="admin-form-field">
        Kitchen status
        <select
          className="admin-input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {FOOD_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <div className="detail-inline-actions">
        <button
          type="button"
          className="admin-btn"
          disabled={saving || status === currentStatus}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Update status"}
        </button>
        <button
          type="button"
          className="admin-btn danger"
          disabled={saving}
          onClick={() => void onDelete()}
        >
          Delete order
        </button>
      </div>
      {error ? (
        <p className="admin-field-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="admin-muted">{message}</p> : null}
    </div>
  );
}
