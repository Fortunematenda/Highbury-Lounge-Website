"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function BookingChannelSyncActions({
  bookingId,
  syncStatus,
  beds24Enabled,
  hasExternalId,
}: {
  bookingId: number;
  syncStatus: string;
  beds24Enabled: boolean;
  hasExternalId: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function retrySync() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_outbound" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sync failed");
      if (data.synced) toast.success(data.message || "Synced to Beds24");
      else toast.message(data.message || data.reason || "No sync performed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  if (!beds24Enabled) {
    return (
      <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
        Channel push is inactive while Beds24 is disabled.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        className="admin-btn secondary"
        disabled={busy || (hasExternalId && syncStatus === "SYNCED")}
        onClick={() => void retrySync()}
      >
        {busy
          ? "Syncing…"
          : hasExternalId
            ? "Re-check channel sync"
            : syncStatus === "FAILED"
              ? "Retry channel sync"
              : "Push to Beds24"}
      </button>
    </div>
  );
}
