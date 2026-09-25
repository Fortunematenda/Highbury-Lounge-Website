"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export type Beds24Status = {
  enabled: boolean;
  credentialsPresent: boolean;
  propertyIdConfigured: boolean;
  webhookSecretConfigured: boolean;
  apiBaseUrl: string;
  bookingComAccommodationNumber: string;
  roomMapping: {
    totalRooms: number;
    mapped: number;
    unmapped: number;
    status: string;
  };
  lastSuccessfulSync: string | null;
  lastIncomingBooking: string | null;
  lastPriceUpdate: string | null;
  lastInventoryUpdate: string | null;
  failedSynchronisations: number;
  webhookStatus: string;
  message: string;
};

export function Beds24IntegrationClient({
  initialStatus,
}: {
  initialStatus: Beds24Status;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [testing, setTesting] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/integrations/beds24/status", {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load status");
    setStatus(data);
  }

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/integrations/beds24/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Test failed");
      if (data.ok) toast.success(data.message || "Connection OK");
      else toast.error(data.message || "Connection failed");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="admin-stack" style={{ gap: 20 }}>
      {!status.enabled ? (
        <div className="admin-warn" role="status">
          Beds24 synchronisation is disabled. Highbury continues to use local
          availability, pricing, and Paynow. Configure credentials below, map
          rooms, then set <code>BEDS24_ENABLED=true</code> when ready.
        </div>
      ) : (
        <div className="admin-success" role="status">
          Beds24 synchronisation is enabled.
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <tbody>
            <tr>
              <th>Integration</th>
              <td>{status.enabled ? "Enabled" : "Disabled"}</td>
            </tr>
            <tr>
              <th>API credentials</th>
              <td>
                {status.credentialsPresent
                  ? "Refresh token + property id present"
                  : "Pending — set BEDS24_REFRESH_TOKEN and BEDS24_PROPERTY_ID"}
              </td>
            </tr>
            <tr>
              <th>API base</th>
              <td>
                <code>{status.apiBaseUrl}</code>
              </td>
            </tr>
            <tr>
              <th>Property mapping</th>
              <td>
                {status.propertyIdConfigured
                  ? "Property ID configured"
                  : "Awaiting Beds24 Property ID"}
              </td>
            </tr>
            <tr>
              <th>Room mapping</th>
              <td>
                {status.roomMapping.status} — {status.roomMapping.mapped}/
                {status.roomMapping.totalRooms} mapped
                {status.roomMapping.unmapped
                  ? ` (${status.roomMapping.unmapped} unmapped)`
                  : ""}
              </td>
            </tr>
            <tr>
              <th>Booking.com accommodation</th>
              <td>
                <code>{status.bookingComAccommodationNumber}</code> (channel
                mapping pending in Beds24)
              </td>
            </tr>
            <tr>
              <th>Last successful sync</th>
              <td>{status.lastSuccessfulSync || "—"}</td>
            </tr>
            <tr>
              <th>Last incoming booking</th>
              <td>{status.lastIncomingBooking || "—"}</td>
            </tr>
            <tr>
              <th>Last price update</th>
              <td>{status.lastPriceUpdate || "—"}</td>
            </tr>
            <tr>
              <th>Last inventory update</th>
              <td>{status.lastInventoryUpdate || "—"}</td>
            </tr>
            <tr>
              <th>Failed synchronisations</th>
              <td>{status.failedSynchronisations}</td>
            </tr>
            <tr>
              <th>Webhook</th>
              <td>
                <code>/api/integrations/beds24/webhook</code>
                <br />
                <span className="muted">{status.webhookStatus}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="hero-actions" style={{ flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          className="admin-btn"
          onClick={() => void testConnection()}
          disabled={testing}
        >
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <Link className="admin-btn secondary" href="/admin/integrations/beds24/mapping">
          Room Mapping
        </Link>
        <Link className="admin-btn secondary" href="/admin/integrations/beds24/logs">
          Sync Logs
        </Link>
        <Link
          className="admin-btn secondary"
          href="/admin/integrations/beds24/reconcile"
        >
          Reconciliation
        </Link>
        <Link className="admin-btn secondary" href="/admin/rates">
          Rates & Availability
        </Link>
      </div>
    </div>
  );
}
