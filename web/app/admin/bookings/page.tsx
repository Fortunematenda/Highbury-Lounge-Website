import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { bookingGuests, bookings, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatDate, formatMoney, statusColor } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage(["booking_manager"]);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const roomTypeId = params.roomTypeId ?? "";
  const checkInFrom = params.checkInFrom ?? "";
  const checkInTo = params.checkInTo ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const db = getDb();
  const rooms = await db.select().from(roomTypes).orderBy(roomTypes.displayOrder);

  const filters: SQL[] = [];
  if (status) filters.push(eq(bookings.status, status));
  if (roomTypeId) filters.push(eq(bookings.roomTypeId, Number(roomTypeId)));
  if (checkInFrom) filters.push(sql`${bookings.checkIn} >= ${checkInFrom}`);
  if (checkInTo) filters.push(sql`${bookings.checkIn} <= ${checkInTo}`);
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        like(bookings.reference, pattern),
        like(bookingGuests.email, pattern),
        like(bookingGuests.phone, pattern),
        like(bookingGuests.firstName, pattern),
        like(bookingGuests.lastName, pattern),
      )!,
    );
  }

  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      status: bookings.status,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      adults: bookings.adults,
      children: bookings.children,
      totalAmount: bookings.totalAmount,
      currency: bookings.currency,
      createdAt: bookings.createdAt,
      roomName: roomTypes.name,
      firstName: bookingGuests.firstName,
      lastName: bookingGuests.lastName,
    })
    .from(bookings)
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .leftJoin(bookingGuests, eq(bookingGuests.bookingId, bookings.id))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const statuses = [
    "Pending",
    "Awaiting Payment",
    "Confirmed",
    "Checked In",
    "Checked Out",
    "Cancelled",
    "Declined",
    "No Show",
    "Expired",
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Bookings</h1>
          <p className="page-sub">Search, filter and manage reservations</p>
        </div>
      </header>

      <form className="admin-filters" method="get">
        <input
          className="admin-input"
          name="q"
          placeholder="Search name, email, phone, reference"
          defaultValue={q}
        />
        <select className="admin-input" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="admin-input" name="roomTypeId" defaultValue={roomTypeId}>
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input className="admin-input" type="date" name="checkInFrom" defaultValue={checkInFrom} />
        <input className="admin-input" type="date" name="checkInTo" defaultValue={checkInTo} />
        <button className="admin-btn" type="submit">
          Filter
        </button>
      </form>

      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10}>No bookings match your filters.</td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id}>
                    <td>{b.reference}</td>
                    <td>
                      {b.firstName} {b.lastName}
                    </td>
                    <td>{b.roomName}</td>
                    <td>{formatDate(b.checkIn)}</td>
                    <td>{formatDate(b.checkOut)}</td>
                    <td>
                      {b.adults}+{b.children}
                    </td>
                    <td>{formatMoney(b.totalAmount, b.currency)}</td>
                    <td>
                      <span
                        className="admin-badge"
                        style={{ background: statusColor(b.status) }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td>{formatDate(b.createdAt.slice(0, 10))}</td>
                    <td>
                      <Link href={`/admin/bookings/${b.id}`}>Open</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          {page > 1 && (
            <Link href={`/admin/bookings?page=${page - 1}&q=${q}&status=${status}`}>
              Previous
            </Link>
          )}
          <span>Page {page}</span>
          {rows.length === PAGE_SIZE && (
            <Link href={`/admin/bookings?page=${page + 1}&q=${q}&status=${status}`}>
              Next
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
