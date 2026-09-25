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

export type GoLiveCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  required: boolean;
};

export type GoLiveReadiness = {
  ready: boolean;
  enabled: boolean;
  checks: GoLiveCheck[];
  blocking: string[];
  nextSteps: string[];
};

export function Beds24IntegrationClient({
  initialStatus,
  initialReadiness,
  webhookUrl,
}: {
  initialStatus: Beds24Status;
  initialReadiness: GoLiveReadiness;
  webhookUrl: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [testing, setTesting] = useState(false);
  const [mappingBusy, setMappingBusy] = useState(false);

  async function refresh() {
    const [statusRes, readyRes] = await Promise.all([
      fetch("/api/admin/integrations/beds24/status", { cache: "no-store" }),
      fetch("/api/admin/integrations/beds24/go-live", { cache: "no-store" }),
    ]);
    const statusData = await statusRes.json();
    const readyData = await readyRes.json();
    if (!statusRes.ok) throw new Error(statusData.error || "Failed to load status");
    if (!readyRes.ok) throw new Error(readyData.error || "Failed to load readiness");
    setStatus(statusData);
    setReadiness(readyData);
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

  async function applyGardenMapping() {
    setMappingBusy(true);
    try {
      const res = await fetch("/api/admin/integrations/beds24/go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_garden_mapping" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mapping failed");
      toast.success(data.message || "Mapping applied");
      if (data.readiness) setReadiness(data.readiness);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mapping failed");
    } finally {
      setMappingBusy(false);
    }
  }

  return (
    <div className="admin-stack" style={{ gap: 20 }}>
      {!status.enabled ? (
        <div className="admin-warn" role="status">
          Beds24 synchronisation is disabled. Complete the go-live checklist
          below, then set <code>BEDS24_ENABLED=true</code> on the server and
          restart.
        </div>
      ) : (
        <div className="admin-success" role="status">
          Beds24 synchronisation is enabled.
        </div>
      )}

      <div
        className={readiness.ready ? "admin-success" : "admin-warn"}
        role="status"
      >
        <strong>
          Go-live readiness:{" "}
          {readiness.ready ? "READY (flag still off until you enable it)" : "NOT READY"}
        </strong>
        {readiness.blocking.length ? (
          <div style={{ marginTop: 6 }}>
            Blocking: {readiness.blocking.join(" · ")}
          </div>
        ) : null}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Checklist</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {readiness.checks.map((check) => (
              <tr key={check.id}>
                <td>
                  {check.label}
                  {!check.required ? (
                    <span className="muted"> · optional</span>
                  ) : null}
                </td>
                <td>
                  <strong
                    style={{
                      color: check.ok
                        ? "var(--admin-success, #157347)"
                        : "var(--admin-danger, #b42318)",
                    }}
                  >
                    {check.ok ? "Pass" : "Fail"}
                  </strong>
                </td>
                <td className="muted">{check.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readiness.nextSteps.length ? (
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {readiness.nextSteps.map((step) => (
            <li key={step} style={{ marginBottom: 6 }}>
              {step}
            </li>
          ))}
        </ol>
      ) : null}

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
                <code>{status.bookingComAccommodationNumber}</code> (managed in
                Beds24 — Highbury does not call Booking.com directly)
              </td>
            </tr>
            <tr>
              <th>Last successful sync</th>
              <td>{status.lastSuccessfulSync || "—"}</td>
            </tr>
            <tr>
              <th>Failed synchronisations</th>
              <td>{status.failedSynchronisations}</td>
            </tr>
            <tr>
              <th>Webhook</th>
              <td>
                <code style={{ wordBreak: "break-all" }}>{webhookUrl}</code>
                <br />
                <button
                  type="button"
                  className="admin-btn ghost"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    void navigator.clipboard.writeText(webhookUrl).then(
                      () => toast.success("Webhook URL copied"),
                      () => toast.error("Could not copy"),
                    );
                  }}
                >
                  Copy webhook URL
                </button>
                <br />
                <span className="muted">{status.webhookStatus}</span>
                <br />
                <span className="muted">
                  Configure in Beds24 → Properties → Access → Booking Webhook.
                  Leave sync disabled until Beds24 activation is complete.
                </span>
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
        <button
          type="button"
          className="admin-btn secondary"
          onClick={() => void applyGardenMapping()}
          disabled={mappingBusy}
        >
          {mappingBusy
            ? "Applying…"
            : "Apply Garden View mapping (735291)"}
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
