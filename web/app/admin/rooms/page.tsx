import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  await requireAdminPage(["content_manager"]);
  const db = getDb();
  const rooms = await db
    .select()
    .from(roomTypes)
    .orderBy(asc(roomTypes.displayOrder));

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Rooms</h1>
          <p className="page-sub">Room types and inventory</p>
        </div>
        <Link className="admin-btn" href="/admin/rooms/new">
          Add room type
        </Link>
      </header>
      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Inventory</th>
                <th>Max guests</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>
                    {formatMoney(r.promotionalPrice ?? r.pricePerNight)}
                    {r.promotionalPrice ? (
                      <small> (list {formatMoney(r.pricePerNight)})</small>
                    ) : null}
                  </td>
                  <td>{r.inventoryCount}</td>
                  <td>{r.maxGuests}</td>
                  <td>{r.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <Link href={`/admin/rooms/${r.id}`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
