import Link from "next/link";
import { and, desc, eq, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { eventReservations, events } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { RESERVATION_STATUSES, isReservationStatus } from "@/lib/event-constants";
import { ReservationsList, type ReservationRow } from "./reservations-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

function isNextRouterError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === "string";
}

export default async function AdminEventReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage(["content_manager"]);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const eventId = Number(params.eventId ?? "");
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  let rows: ReservationRow[] = [];
  try {
    const db = getDb();
    const filters = [];
    if (status && isReservationStatus(status)) {
      filters.push(eq(eventReservations.status, status));
    }
    if (Number.isFinite(eventId) && eventId > 0) {
      filters.push(eq(eventReservations.eventId, eventId));
    }
    if (q) {
      const pattern = `%${q}%`;
      filters.push(
        or(
          like(eventReservations.reference, pattern),
          like(eventReservations.fullName, pattern),
          like(eventReservations.email, pattern),
          like(eventReservations.phone, pattern),
          like(events.title, pattern),
        )!,
      );
    }

    rows = await db
      .select({
        id: eventReservations.id,
        reference: eventReservations.reference,
        fullName: eventReservations.fullName,
        email: eventReservations.email,
        phone: eventReservations.phone,
        guestCount: eventReservations.guestCount,
        status: eventReservations.status,
        reservationType: eventReservations.reservationType,
        createdAt: eventReservations.createdAt,
        eventId: events.id,
        eventTitle: events.title,
        eventSlug: events.slug,
        eventStartAt: events.startAt,
      })
      .from(eventReservations)
      .leftJoin(events, eq(eventReservations.eventId, events.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(eventReservations.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error("[admin/events/reservations] Failed to load reservations:", err);
  }

  const eventLabel =
    Number.isFinite(eventId) && eventId > 0
      ? rows.find((r) => r.eventId === eventId)?.eventTitle
      : null;

  const qs = (extra: Record<string, string | number>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (Number.isFinite(eventId) && eventId > 0) sp.set("eventId", String(eventId));
    for (const [k, v] of Object.entries(extra)) sp.set(k, String(v));
    return sp.toString();
  };

  return (
    <div className="admin-page pms-page">
      <header className="pms-page-header">
        <div className="pms-page-header-copy">
          <p className="pms-eyebrow">Operations</p>
          <h1>Event Reservations</h1>
          <p className="pms-page-sub">
            {eventLabel
              ? `Reservations for “${eventLabel}”`
              : "Review and manage guest reservations for events"}
          </p>
        </div>
      </header>

      <form className="admin-filters" method="get">
        <input
          className="admin-input"
          name="q"
          placeholder="Search reference, name, email, phone"
          defaultValue={q}
        />
        <select className="admin-input" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {RESERVATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {Number.isFinite(eventId) && eventId > 0 ? (
          <input type="hidden" name="eventId" value={eventId} />
        ) : null}
        <button className="admin-btn" type="submit">
          Filter
        </button>
        {Number.isFinite(eventId) && eventId > 0 ? (
          <Link className="admin-btn secondary" href="/admin/events/reservations">
            Clear event filter
          </Link>
        ) : null}
      </form>

      <section className="admin-card">
        <ReservationsList rows={rows} />
        <div className="admin-pagination">
          {page > 1 && (
            <Link href={`/admin/events/reservations?${qs({ page: page - 1 })}`}>
              Previous
            </Link>
          )}
          <span>Page {page}</span>
          {rows.length === PAGE_SIZE && (
            <Link href={`/admin/events/reservations?${qs({ page: page + 1 })}`}>
              Next
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
