"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AdminFormField,
  AdminSelect,
  AdminTextarea,
} from "@/app/admin/components/form-fields";
import { confirmDialog } from "@/app/admin/components/confirm-dialog";
import { DetailFieldGrid } from "@/app/admin/components/detail-page";
import { RESERVATION_STATUSES } from "@/lib/event-constants";

export function ReservationStatusForm({
  reservationId,
  reference,
  currentStatus,
  initialAdminNotes,
}: {
  reservationId: number;
  reference: string;
  currentStatus: string;
  initialAdminNotes?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/admin/events/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: fd.get("status"),
          adminNotes: fd.get("adminNotes"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save reservation");
      toast.success("Reservation saved");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save reservation",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (busy) return;
    if (
      !(await confirmDialog(
        `Delete reservation ${reference}? This permanently removes it and cannot be undone.`,
      ))
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/events/reservations/${reservationId}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete reservation");
      toast.success("Reservation deleted");
      router.push("/admin/events/reservations");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete reservation",
      );
      setBusy(false);
    }
  }

  return (
    <form className="detail-inline-form" onSubmit={onSubmit}>
      <DetailFieldGrid columns={2}>
        <AdminFormField label="Status" required>
          <AdminSelect name="status" defaultValue={currentStatus}>
            {RESERVATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </AdminSelect>
        </AdminFormField>
        <AdminFormField label="Internal notes" hint="Not visible to the guest">
          <AdminTextarea
            name="adminNotes"
            rows={4}
            defaultValue={initialAdminNotes ?? ""}
            placeholder="Notes for the team…"
          />
        </AdminFormField>
      </DetailFieldGrid>
      <div className="detail-inline-actions">
        <button className="admin-btn" type="submit" disabled={busy}>
          <Save size={16} aria-hidden />
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="admin-btn danger"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          <Trash2 size={16} aria-hidden />
          Delete reservation
        </button>
      </div>
    </form>
  );
}
