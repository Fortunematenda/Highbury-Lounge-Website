import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import {
  createEvent,
  EventError,
  isEventCategory,
  isEventStatus,
} from "@/lib/events";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await requireAdmin(["administrator", "content_manager", "booking_manager"]);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = url.searchParams.get("status") || "";
    const category = url.searchParams.get("category") || "";
    const sort = url.searchParams.get("sort") || "start_asc";
    const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
    const pageSize = 20;

    const db = getDb();
    const filters = [isNull(events.deletedAt)];
    if (status && isEventStatus(status)) {
      filters.push(eq(events.status, status));
    }
    if (category && isEventCategory(category)) {
      filters.push(eq(events.category, category));
    }
    if (q) {
      const pattern = `%${q}%`;
      filters.push(
        or(
          like(events.title, pattern),
          like(events.slug, pattern),
          like(events.artistOrHost, pattern),
        )!,
      );
    }

    const order =
      sort === "start_desc"
        ? desc(events.startAt)
        : sort === "title"
          ? asc(events.title)
          : sort === "created"
            ? desc(events.createdAt)
            : asc(events.startAt);

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        category: events.category,
        startAt: events.startAt,
        endAt: events.endAt,
        status: events.status,
        isFeatured: events.isFeatured,
        coverImage: events.coverImage,
        posterImage: events.posterImage,
        capacity: events.capacity,
        trackCapacity: events.trackCapacity,
        soldOutOverride: events.soldOutOverride,
        entryType: events.entryType,
        price: events.price,
        currency: events.currency,
        publishedAt: events.publishedAt,
        createdAt: events.createdAt,
        reservationCount: sql<number>`(
          select count(*) from event_reservations er
          where er.event_id = ${events.id}
        )`,
      })
      .from(events)
      .where(and(...filters))
      .orderBy(order)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return Response.json({ events: rows, page, pageSize });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load events.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    const body = await request.json();
    const event = await createEvent(body);
    await writeAuditLog({
      adminUserId: user.id,
      action: "event.create",
      entityType: "event",
      entityId: event.id,
      details: { title: event.title, slug: event.slug },
    });
    return Response.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof EventError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to create event.", 500);
  }
}
