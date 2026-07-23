import Link from "next/link";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookings,
  bookingGuests,
  conferenceEnquiries,
  roomTypes,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { todayISODate } from "@/lib/availability";
import { formatDate, formatMoney, statusColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const db = getDb();
  const today = todayISODate();

  const [totals] = await db.select({ value: count() }).from(bookings);
  const [pending] = await db
    .select({ value: count() })
    .from(bookings)
    .where(eq(bookings.status, "Pending"));
  const [confirmed] = await db
    .select({ value: count() })
    .from(bookings)
    .where(eq(bookings.status, "Confirmed"));
  const [cancelled] = await db
    .select({ value: count() })
    .from(bookings)
    .where(eq(bookings.status, "Cancelled"));
  const [checkIns] = await db
    .select({ value: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.checkIn, today),
        inArray(bookings.status, ["Confirmed", "Pending", "Awaiting Payment"]),
      ),
    );
  const [checkOuts] = await db
    .select({ value: count() })
    .from(bookings)
    .where(and(eq(bookings.checkOut, today), eq(bookings.status, "Checked In")));
  const [occupied] = await db
    .select({ value: count() })
    .from(bookings)
    .where(eq(bookings.status, "Checked In"));
  const [conferenceCount] = await db
    .select({ value: count() })
    .from(conferenceEnquiries);

  const revenueRows = await db
    .select({ total: bookings.totalAmount })
    .from(bookings)
    .where(
      inArray(bookings.status, ["Confirmed", "Checked In", "Checked Out"]),
    );
  const revenue = revenueRows.reduce((sum, r) => sum + (r.total || 0), 0);

  const inventory = await db.select({ qty: roomTypes.inventoryCount }).from(roomTypes);
  const totalRooms = inventory.reduce((s, r) => s + r.qty, 0);
  const availableEstimate = Math.max(0, totalRooms - (occupied?.value ?? 0));

  const recent = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      status: bookings.status,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
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
    .orderBy(desc(bookings.createdAt))
    .limit(8);

  const upcomingIn = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      checkIn: bookings.checkIn,
      roomName: roomTypes.name,
      firstName: bookingGuests.firstName,
      lastName: bookingGuests.lastName,
    })
    .from(bookings)
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .leftJoin(bookingGuests, eq(bookingGuests.bookingId, bookings.id))
    .where(
      and(
        gte(bookings.checkIn, today),
        inArray(bookings.status, ["Confirmed", "Awaiting Payment", "Pending"]),
      ),
    )
    .orderBy(bookings.checkIn)
    .limit(5);

  const upcomingOut = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
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
        gte(bookings.checkOut, today),
        inArray(bookings.status, ["Checked In", "Confirmed"]),
      ),
    )
    .orderBy(bookings.checkOut)
    .limit(5);

  const stats = [
    { label: "Total bookings", value: totals?.value ?? 0 },
    { label: "Pending", value: pending?.value ?? 0 },
    { label: "Confirmed", value: confirmed?.value ?? 0 },
    { label: "Today check-ins", value: checkIns?.value ?? 0 },
    { label: "Today check-outs", value: checkOuts?.value ?? 0 },
    { label: "Occupied now", value: occupied?.value ?? 0 },
    { label: "Rooms available (est.)", value: availableEstimate },
    { label: "Cancelled", value: cancelled?.value ?? 0 },
    { label: "Conference enquiries", value: conferenceCount?.value ?? 0 },
    { label: "Est. revenue", value: formatMoney(revenue) },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Live booking and occupancy overview</p>
        </div>
        <div className="admin-quick-actions">
          <Link className="admin-btn" href="/admin/bookings">
            View bookings
          </Link>
          <Link className="admin-btn secondary" href="/admin/rooms/new">
            Add room type
          </Link>
          <Link className="admin-btn secondary" href="/admin/blocks">
            Block room
          </Link>
          <Link className="admin-btn secondary" href="/admin/calendar">
            Calendar
          </Link>
          <Link className="admin-btn secondary" href="/admin/packages">
            Conference packages
          </Link>
          <Link className="admin-btn secondary" href="/admin/menus">
            Update menu
          </Link>
        </div>
      </header>

      <div className="admin-stat-grid">
        {stats.map((s) => (
          <div className="admin-stat-card" key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>Recent bookings</h2>
          <Link href="/admin/bookings">All bookings</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6}>No bookings yet.</td>
                </tr>
              ) : (
                recent.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/admin/bookings/${b.id}`}>{b.reference}</Link>
                    </td>
                    <td>
                      {b.firstName} {b.lastName}
                    </td>
                    <td>{b.roomName}</td>
                    <td>
                      {formatDate(b.checkIn)} – {formatDate(b.checkOut)}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-two-col">
        <section className="admin-card">
          <h2>Upcoming check-ins</h2>
          <ul className="admin-list">
            {upcomingIn.length === 0 && <li>None scheduled.</li>}
            {upcomingIn.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`}>{b.reference}</Link> —{" "}
                {b.firstName} {b.lastName} · {b.roomName} · {formatDate(b.checkIn)}
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-card">
          <h2>Upcoming check-outs</h2>
          <ul className="admin-list">
            {upcomingOut.length === 0 && <li>None scheduled.</li>}
            {upcomingOut.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`}>{b.reference}</Link> —{" "}
                {b.firstName} {b.lastName} · {b.roomName} · {formatDate(b.checkOut)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
