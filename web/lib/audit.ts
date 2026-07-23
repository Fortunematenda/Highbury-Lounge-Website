import { getDb } from "@/db";
import { adminAuditLogs } from "@/db/schema";

export async function writeAuditLog(params: {
  adminUserId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  details?: unknown;
  ipAddress?: string | null;
}) {
  const db = getDb();
  await db.insert(adminAuditLogs).values({
    adminUserId: params.adminUserId ?? null,
    action: params.action,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    detailsJson: params.details ? JSON.stringify(params.details) : null,
    ipAddress: params.ipAddress ?? null,
  });
}
