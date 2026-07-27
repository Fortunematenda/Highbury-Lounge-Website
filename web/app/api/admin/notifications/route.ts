import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { adminNotifications } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") ?? "30") || 30),
    );

    const db = getDb();
    const filters: SQL[] = [];
    if (unreadOnly) filters.push(eq(adminNotifications.isRead, false));
    if (q) {
      const pattern = `%${q}%`;
      filters.push(
        or(
          like(adminNotifications.title, pattern),
          like(adminNotifications.message, pattern),
          like(adminNotifications.type, pattern),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(adminNotifications)
      .where(where)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [unread] = await db
      .select({ value: sql<number>`count(*)` })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));

    const [totalRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(adminNotifications)
      .where(where);

    return Response.json({
      notifications: rows,
      unreadCount: Number(unread?.value ?? 0),
      total: Number(totalRow?.value ?? 0),
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load notifications.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const db = getDb();
    const now = new Date().toISOString();

    if (body.markAllRead) {
      await db
        .update(adminNotifications)
        .set({ isRead: true, readAt: now, updatedAt: now })
        .where(eq(adminNotifications.isRead, false));
      await writeAuditLog({
        actor: user,
        action: "notification.mark_all_read",
        entityType: "admin_notification",
        details: {},
      });
      return Response.json({ ok: true });
    }

    const id = Number(body.id);
    if (!Number.isFinite(id)) return jsonError("Notification id required.", 400);

    await db
      .update(adminNotifications)
      .set({
        isRead: body.isRead !== false,
        readAt: body.isRead === false ? null : now,
        updatedAt: now,
      })
      .where(eq(adminNotifications.id, id));

    await writeAuditLog({
      actor: user,
      action: "notification.read",
      entityType: "admin_notification",
      entityId: id,
      details: { isRead: body.isRead !== false },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to update notification.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAdmin();
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isFinite(id)) {
      const body = await request.json().catch(() => ({}));
      const bodyId = Number(body.id);
      if (!Number.isFinite(bodyId)) {
        return jsonError("Notification id required.", 400);
      }
      const db = getDb();
      await db
        .delete(adminNotifications)
        .where(eq(adminNotifications.id, bodyId));
      await writeAuditLog({
        actor: user,
        action: "notification.delete",
        entityType: "admin_notification",
        entityId: bodyId,
      });
      return Response.json({ ok: true });
    }

    const db = getDb();
    await db.delete(adminNotifications).where(eq(adminNotifications.id, id));
    await writeAuditLog({
      actor: user,
      action: "notification.delete",
      entityType: "admin_notification",
      entityId: id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to delete notification.", 500);
  }
}
