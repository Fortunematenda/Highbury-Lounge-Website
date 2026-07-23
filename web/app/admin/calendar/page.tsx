import Link from "next/link";
import { and, gte, lte, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, bookingGuests, roomBlocks, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { statusColor } from "@/lib/format";

export const dynamic = "force-dynamic";

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end, daysInMonth: endDate.getUTCDate() };
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; roomTypeId?: string }>;
}) {
  await requireAdminPage(["booking_manager"]);
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const { start, end, daysInMonth } = monthBounds(year, month);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const db = getDb();
  const rooms = await db.select().from(roomTypes);
  const roomFilter = params.roomTypeId ? eq(bookings.roomTypeId, Number(params.roomTypeId)) : undefined;

  const rows = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      status: bookings.status,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      roomName: roomTypes.name,
      firstName: bookingGuests.firstName,
      lastName: bookingGuests.lastName,
    })
    .from(bookings)
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .leftJoin(bookingGuests, eq(bookingGuests.bookingId, bookings.id))
    .where(
      and(
        lte(bookings.checkIn, end),
        gte(bookings.checkOut, start),
        roomFilter,
      ),
    );

  const blocks = await db
    .select({
      id: roomBlocks.id,
      startDate: roomBlocks.startDate,
      endDate: roomBlocks.endDate,
      reason: roomBlocks.reason,
      roomName: roomTypes.name,
    })
    .from(roomBlocks)
    .leftJoin(roomTypes, eq(roomBlocks.roomTypeId, roomTypes.id))
    .where(and(lte(roomBlocks.startDate, end), gte(roomBlocks.endDate, start)));

  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Calendar</h1>
          <p className="page-sub">{label}</p>
        </div>
        <div className="admin-quick-actions">
          <Link
            className="admin-btn secondary"
            href={`/admin/calendar?year=${prev.year}&month=${prev.month}`}
          >
            Previous
          </Link>
          <Link
            className="admin-btn secondary"
            href={`/admin/calendar?year=${next.year}&month=${next.month}`}
          >
            Next
          </Link>
        </div>
      </header>

      <form className="admin-filters" method="get">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <select className="admin-input" name="roomTypeId" defaultValue={params.roomTypeId ?? ""}>
          <option value="">All room types</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className="admin-btn" type="submit">
          Filter
        </button>
      </form>

      <section className="admin-card">
        <div className="admin-calendar-grid">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayBookings = rows.filter(
              (b) => b.checkIn <= date && b.checkOut > date,
            );
            const dayBlocks = blocks.filter(
              (b) => b.startDate <= date && b.endDate > date,
            );
            return (
              <div className="admin-calendar-day" key={date}>
                <strong>{day}</strong>
                {dayBookings.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    className="admin-cal-item"
                    style={{ borderLeftColor: statusColor(b.status) }}
                    title={`${b.reference} · ${b.status}`}
                  >
                    {b.reference}
                  </Link>
                ))}
                {dayBlocks.map((b) => (
                  <span key={`b-${b.id}`} className="admin-cal-block">
                    Block: {b.reason}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
