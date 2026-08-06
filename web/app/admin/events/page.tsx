import Link from "next/link";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { getDb } from "@/db";
import { eventReservations, events } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  isEventCategory,
  isEventStatus,
} from "@/lib/event-constants";
import { EventsList } from "./events-list";
import type { EventRow } from "./events-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function isNextRouterError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === "string";
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage(["content_manager"]);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const category = params.category ?? "";
  const sort = params.sort ?? "start_asc";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  let rows: EventRow[] = [];
  try {
    const db = getDb();
    const filters = [isNull(events.deletedAt)];
    if (status && isEventStatus(status)) filters.push(eq(events.status, status));
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

    const reservationCountSq = db
      .select({
        eventId: eventReservations.eventId,
        count: sql<number>`count(*)`.mapWith(Number).as("reservation_count"),
      })
      .from(eventReservations)
      .groupBy(eventReservations.eventId)
      .as("rc");

    rows = (await db
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
        reservationCount: sql<number>`coalesce(${reservationCountSq.count}, 0)`.mapWith(Number),
      })
      .from(events)
      .leftJoin(reservationCountSq, eq(events.id, reservationCountSq.eventId))
      .where(and(...filters))
      .orderBy(order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)) as EventRow[];
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error("[admin/events] Failed to load events:", err);
  }

  const qs = (extra: Record<string, string | number>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (category) sp.set("category", category);
    if (sort !== "start_asc") sp.set("sort", sort);
    for (const [k, v] of Object.entries(extra)) sp.set(k, String(v));
    return sp.toString();
  };

  return (
    <div className="admin-page pms-page">
      <header className="pms-page-header">
        <div className="pms-page-header-copy">
          <p className="pms-eyebrow">Content</p>
          <h1>Events</h1>
          <p className="pms-page-sub">
            Manage the events calendar shown on the public website
          </p>
        </div>
        <div className="pms-page-header-actions">
          <Link className="admin-btn" href="/admin/events/new" prefetch={false}>
            <Plus size={16} aria-hidden />
            Add event
          </Link>
        </div>
      </header>

      <form className="admin-filters" method="get">
        <input
          className="admin-input"
          name="q"
          placeholder="Search title, slug, artist/host"
          defaultValue={q}
        />
        <select className="admin-input" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select className="admin-input" name="category" defaultValue={category}>
          <option value="">All categories</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="admin-input" name="sort" defaultValue={sort}>
          <option value="start_asc">Soonest first</option>
          <option value="start_desc">Latest first</option>
          <option value="title">Title A–Z</option>
          <option value="created">Recently created</option>
        </select>
        <button className="admin-btn" type="submit">
          Filter
        </button>
      </form>

      <section className="admin-card">
        <EventsList rows={rows} />
        <div className="admin-pagination">
          {page > 1 && (
            <Link href={`/admin/events?${qs({ page: page - 1 })}`} prefetch={false}>Previous</Link>
          )}
          <span>Page {page}</span>
          {rows.length === PAGE_SIZE && (
            <Link href={`/admin/events?${qs({ page: page + 1 })}`} prefetch={false}>Next</Link>
          )}
        </div>
      </section>
    </div>
  );
}
