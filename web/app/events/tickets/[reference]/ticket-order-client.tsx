"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TicketOrderClient({ reference }: { reference: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function refreshStatus() {
    setChecking(true);
    try {
      const res = await fetch(`/api/events/tickets/${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.order?.paymentStatus === "paid") {
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <button
      type="button"
      className="button ghost"
      onClick={refreshStatus}
      disabled={checking}
    >
      {checking ? "Checking…" : "I’ve paid — refresh status"}
    </button>
  );
}
