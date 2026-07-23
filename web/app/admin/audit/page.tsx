import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";

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
      <section className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>When</th><th>Action</th><th>Entity</th><th>Admin ID</th><th>Details</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt}</td>
                <td>{r.action}</td>
                <td>{r.entityType} {r.entityId ?? ""}</td>
                <td>{r.adminUserId ?? "—"}</td>
                <td><code>{r.detailsJson || ""}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
