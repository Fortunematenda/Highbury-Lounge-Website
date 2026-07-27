import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs, adminUsers, roles } from "@/db/schema";
import type { AdminSessionUser } from "@/lib/auth";

export type AuditActor = {
  id: number;
  fullName: string;
  email: string;
  roleName: string;
};

function mergeDetails(
  details: unknown,
  changedBy: AuditActor | null,
): string | null {
  const base: Record<string, unknown> =
    details == null
      ? {}
      : typeof details === "object" && !Array.isArray(details)
        ? { ...(details as Record<string, unknown>) }
        : { data: details };

  if (changedBy) {
    base.changedBy = changedBy;
  }

  if (Object.keys(base).length === 0) return null;
  return JSON.stringify(base);
}

async function resolveActor(
  adminUserId?: number | null,
  actor?: AdminSessionUser | AuditActor | null,
): Promise<AuditActor | null> {
  if (actor) {
    return {
      id: actor.id,
      fullName: actor.fullName,
      email: actor.email,
      roleName: actor.roleName || "Admin",
    };
  }
  if (!adminUserId) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: adminUsers.id,
      fullName: adminUsers.fullName,
      email: adminUsers.email,
      roleName: roles.name,
    })
    .from(adminUsers)
    .innerJoin(roles, eq(adminUsers.roleId, roles.id))
    .where(eq(adminUsers.id, adminUserId))
    .limit(1);

  return row ?? null;
}

/** Persist an admin action with the logged-in user's name, email, and role. */
export async function writeAuditLog(params: {
  adminUserId?: number | null;
  /** Prefer passing the session user so name/email are snapshotted without a lookup. */
  actor?: AdminSessionUser | AuditActor | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  details?: unknown;
  ipAddress?: string | null;
}) {
  const adminUserId = params.actor?.id ?? params.adminUserId ?? null;
  const changedBy = await resolveActor(adminUserId, params.actor ?? null);
  const db = getDb();
  await db.insert(adminAuditLogs).values({
    adminUserId,
    action: params.action,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    detailsJson: mergeDetails(params.details, changedBy),
    ipAddress: params.ipAddress ?? null,
  });
}

function actorFromDetails(detailsJson: string | null): AuditActor | null {
  if (!detailsJson) return null;
  try {
    const parsed = JSON.parse(detailsJson) as { changedBy?: AuditActor };
    if (parsed.changedBy?.fullName && parsed.changedBy?.email) {
      return parsed.changedBy;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function getLatestEntityChange(
  entityType: string,
  entityId: number,
): Promise<{
  action: string;
  createdAt: string;
  actor: AuditActor | null;
} | null> {
  const db = getDb();
  const [latest] = await db
    .select({
      action: adminAuditLogs.action,
      createdAt: adminAuditLogs.createdAt,
      detailsJson: adminAuditLogs.detailsJson,
      adminUserId: adminAuditLogs.adminUserId,
      fullName: adminUsers.fullName,
      email: adminUsers.email,
      roleName: roles.name,
    })
    .from(adminAuditLogs)
    .leftJoin(adminUsers, eq(adminAuditLogs.adminUserId, adminUsers.id))
    .leftJoin(roles, eq(adminUsers.roleId, roles.id))
    .where(
      and(
        eq(adminAuditLogs.entityType, entityType),
        eq(adminAuditLogs.entityId, entityId),
      ),
    )
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(1);

  if (!latest) return null;

  const actor: AuditActor | null =
    latest.adminUserId && latest.fullName && latest.email
      ? {
          id: latest.adminUserId,
          fullName: latest.fullName,
          email: latest.email,
          roleName: latest.roleName ?? "Admin",
        }
      : actorFromDetails(latest.detailsJson);

  return {
    action: latest.action,
    createdAt: latest.createdAt,
    actor,
  };
}

export function formatAuditActorLabel(
  actor: AuditActor | null | undefined,
): string {
  if (!actor) return "—";
  return actor.roleName
    ? `${actor.fullName} (${actor.roleName})`
    : actor.fullName;
}

export function parseChangedByFromDetails(
  detailsJson: string | null,
): AuditActor | null {
  return actorFromDetails(detailsJson);
}
