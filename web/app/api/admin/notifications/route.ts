import { desc, eq, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { adminNotifications } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "30") || 30));

    const db = getDb();
    const where = unreadOnly ? eq(adminNotifications.isRead, false) : undefined;
    const rows = await db
      .select()
      .from(adminNotifications)
      .where(where)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit);

    const [unread] = await db
      .select({ value: sql<number>`count(*)` })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));

    return Response.json({
      notifications: rows,
      unreadCount: Number(unread?.value ?? 0),
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load notifications.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const db = getDb();
    const now = new Date().toISOString();

    if (body.markAllRead) {
      await db
        .update(adminNotifications)
        .set({ isRead: true, readAt: now, updatedAt: now })
        .where(eq(adminNotifications.isRead, false));
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

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to update notification.", 500);
  }
}
