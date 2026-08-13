"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/app/admin/components/confirm-dialog";

export function TicketOrderActions({
  orderId,
  reference,
  paymentStatus,
  initialAdminNotes,
}: {
  orderId: number;
  reference: string;
  paymentStatus: string;
  initialAdminNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialAdminNotes ?? "");
  const [busy, setBusy] = useState(false);

  async function run(action: "verify" | "cancel") {
    if (busy) return;
    const ok = await confirmDialog(
      action === "verify"
        ? {
            title: "Verify payment?",
            description:
              "Mark this bank payment as verified and issue the ticket?",
            confirmLabel: "Verify",
            tone: "default",
          }
        : {
            title: "Cancel ticket order?",
            description: "Cancel this ticket order?",
            confirmLabel: "Cancel order",
            tone: "danger",
          },
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/events/tickets/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes: notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(action === "verify" ? "Ticket verified" : "Order cancelled");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (busy) return;
    if (
      !(await confirmDialog(
        `Delete ticket order ${reference}? This permanently removes the order and cannot be undone.`,
      ))
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/events/tickets/${orderId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Ticket order deleted");
      router.push("/admin/events/tickets");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <div className="detail-inline-form">
      <label className="admin-form-field">
        <span>Admin notes</span>
        <textarea
          className="admin-textarea"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <div className="detail-inline-actions">
        {paymentStatus === "pending" ? (
          <>
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => run("verify")}
            >
              Verify payment &amp; issue ticket
            </button>
            <button
              type="button"
              className="admin-btn secondary"
              disabled={busy}
              onClick={() => run("cancel")}
            >
              Cancel order
            </button>
          </>
        ) : paymentStatus === "paid" ? (
          <p className="page-sub">Payment verified. Ticket is active.</p>
        ) : (
          <p className="page-sub">This order is cancelled.</p>
        )}
        <button
          type="button"
          className="admin-btn danger"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          <Trash2 size={16} aria-hidden />
          {busy ? "Working…" : "Delete order"}
        </button>
      </div>
    </div>
  );
}
