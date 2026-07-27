import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs, adminUsers, roles } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import {
  formatAuditActorLabel,
  parseChangedByFromDetails,
  type AuditActor,
} from "@/lib/audit";

export const dynamic = "force-dynamic";

function formatDetails(raw: string | null) {
  if (!raw) return "—";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const { changedBy: _changedBy, ...rest } = parsed;
    if (Object.keys(rest).length === 0) return "—";
    return JSON.stringify(rest, null, 2);
  } catch {
    return raw;
  }
}

function resolveActor(row: {
  adminUserId: number | null;
  fullName: string | null;
  email: string | null;
  roleName: string | null;
  detailsJson: string | null;
}): AuditActor | null {
  if (row.adminUserId && row.fullName && row.email) {
    return {
      id: row.adminUserId,
      fullName: row.fullName,
      email: row.email,
      roleName: row.roleName ?? "Admin",
    };
  }
  return parseChangedByFromDetails(row.detailsJson);
}

export default async function AuditPage() {
  await requireAdminPage(["administrator"]);
  const db = getDb();
  const rows = await db
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      entityType: adminAuditLogs.entityType,
      entityId: adminAuditLogs.entityId,
      detailsJson: adminAuditLogs.detailsJson,
      createdAt: adminAuditLogs.createdAt,
      adminUserId: adminAuditLogs.adminUserId,
      fullName: adminUsers.fullName,
      email: adminUsers.email,
      roleName: roles.name,
    })
    .from(adminAuditLogs)
    .leftJoin(adminUsers, eq(adminAuditLogs.adminUserId, adminUsers.id))
    .leftJoin(roles, eq(adminUsers.roleId, roles.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(200);

  return (
    <div className="admin-page">
      <h1>Audit log</h1>
      <p className="page-sub">
        Recent admin actions with the signed-in user who made each change.
      </p>
      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table admin-audit-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Changed by</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No audit entries yet.</td>
                </tr>
              ) : (
                rows.map((r) => {
                  const actor = resolveActor(r);
                  return (
                    <tr key={r.id}>
                      <td className="admin-audit-when">{r.createdAt}</td>
                      <td>
                        {actor ? (
                          <div className="admin-audit-actor">
                            <strong>{formatAuditActorLabel(actor)}</strong>
                            <span>{actor.email}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{r.action}</td>
                      <td>
                        {r.entityType} {r.entityId ?? ""}
                      </td>
                      <td className="admin-audit-details">
                        <pre>{formatDetails(r.detailsJson)}</pre>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
