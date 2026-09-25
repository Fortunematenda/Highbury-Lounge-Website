import { ScrollText } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { BEDS24_PROVIDER, listChannelSyncLogs } from "@/lib/channel-manager";
import {
  DetailPageShell,
  DetailSectionCard,
} from "@/app/admin/components/detail-page";

export const dynamic = "force-dynamic";

export default async function Beds24LogsPage() {
  await requireAdminPage(["administrator", "booking_manager"]);
  const logs = await listChannelSyncLogs({
    provider: BEDS24_PROVIDER,
    limit: 100,
  });

  return (
    <DetailPageShell
      pageTitle="Sync logs"
      breadcrumbs={[
        { label: "Beds24", href: "/admin/integrations/beds24" },
        { label: "Sync logs" },
      ]}
      title="Beds24 sync logs"
      description="Technical channel sync events. Tokens and payment details are never stored."
      backAction={{
        label: "Back to Beds24",
        href: "/admin/integrations/beds24",
      }}
    >
      <DetailSectionCard title="Recent events" icon={ScrollText}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Direction</th>
                <th>Event</th>
                <th>Status</th>
                <th>Entity</th>
                <th>External ref</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No sync logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.createdAt}</td>
                    <td>{log.direction}</td>
                    <td>{log.eventType}</td>
                    <td>{log.status}</td>
                    <td>
                      {log.entityType}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </td>
                    <td>{log.externalReference || "—"}</td>
                    <td>
                      {log.message || "—"}
                      {log.error ? (
                        <>
                          <br />
                          <span className="form-error">{log.error}</span>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DetailSectionCard>
    </DetailPageShell>
  );
}
