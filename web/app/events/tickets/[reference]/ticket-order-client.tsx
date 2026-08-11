"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TicketOrderClient({ reference }: { reference: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function refreshStatus() {
    setChecking(true);
    try {
      await fetch(`/api/events/tickets/${encodeURIComponent(reference)}`, {
        cache: "no-store",
      });
      router.refresh();
    } finally {
      setChecking(false);
    }
  }

  return (
    <button
      type="button"
      className="button primary event-ticket-refresh-btn"
      onClick={refreshStatus}
      disabled={checking}
    >
      {checking ? "Checking…" : "I’ve paid — refresh status"}
    </button>
  );
}
