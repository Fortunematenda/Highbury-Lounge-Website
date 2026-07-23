import { count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings, conferenceEnquiries, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdminPage(["booking_manager", "administrator"]);
  const db = getDb();

  const byStatus = await db
    .select({ status: bookings.status, total: count() })
    .from(bookings)
    .groupBy(bookings.status);

  const byRoom = await db
    .select({
      room: roomTypes.name,
      total: count(),
      revenue: sql<number>`coalesce(sum(${bookings.totalAmount}), 0)`,
    })
    .from(bookings)
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .groupBy(roomTypes.name);

  const [conf] = await db.select({ total: count() }).from(conferenceEnquiries);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-sub">Real booking and enquiry statistics</p>
        </div>
        <a className="admin-btn secondary" href="/api/admin/reports/csv?type=bookings">
          Export bookings CSV
        </a>
      </header>

      <div className="admin-two-col">
        <section className="admin-card">
          <h2>Bookings by status</h2>
          <ul className="admin-list">
            {byStatus.map((r) => (
              <li key={r.status}>{r.status}: {r.total}</li>
            ))}
          </ul>
        </section>
        <section className="admin-card">
          <h2>Bookings by room</h2>
          <ul className="admin-list">
            {byRoom.map((r) => (
              <li key={r.room || "unknown"}>
                {r.room || "Unknown"}: {r.total} · {formatMoney(Number(r.revenue))}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="admin-card">
        <h2>Conference enquiries</h2>
        <p>{conf?.total ?? 0} total enquiries</p>
      </section>
    </div>
  );
}
