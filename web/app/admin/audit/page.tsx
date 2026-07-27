import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";

function formatDetails(raw: string | null) {
  if (!raw) return "—";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default async function AuditPage() {
  await requireAdminPage(["administrator"]);
  const db = getDb();
  const rows = await db
    .select()
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(200);

  return (
    <div className="admin-page">
      <h1>Audit log</h1>
      <p className="page-sub">Recent admin actions</p>
      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table admin-audit-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Admin ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No audit entries yet.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="admin-audit-when">{r.createdAt}</td>
                    <td>{r.action}</td>
                    <td>
                      {r.entityType} {r.entityId ?? ""}
                    </td>
                    <td>{r.adminUserId ?? "—"}</td>
                    <td className="admin-audit-details">
                      <pre>{formatDetails(r.detailsJson)}</pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
