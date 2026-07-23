import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomBlocks, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatDate } from "@/lib/format";
import { BlockForm } from "./block-form";

export const dynamic = "force-dynamic";

export default async function AdminBlocksPage() {
  await requireAdminPage(["booking_manager", "content_manager"]);
  const db = getDb();
  const rooms = await db.select().from(roomTypes);
  const blocks = await db
    .select({
      block: roomBlocks,
      roomName: roomTypes.name,
    })
    .from(roomBlocks)
    .leftJoin(roomTypes, eq(roomBlocks.roomTypeId, roomTypes.id))
    .orderBy(desc(roomBlocks.startDate));

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Room blocks</h1>
          <p className="page-sub">Maintenance, private use and manual holds reduce availability</p>
        </div>
      </header>
      <BlockForm rooms={rooms.map((r) => ({ id: r.id, name: r.name }))} />
      <section className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Dates</th>
              <th>Rooms</th>
              <th>Reason</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {blocks.map(({ block, roomName }) => (
              <tr key={block.id}>
                <td>{roomName}</td>
                <td>
                  {formatDate(block.startDate)} – {formatDate(block.endDate)}
                </td>
                <td>{block.roomsBlocked}</td>
                <td>{block.reason}</td>
                <td>
                  <form action={`/api/admin/blocks/${block.id}`} method="post">
                    <input type="hidden" name="_method" value="DELETE" />
                  </form>
                  <Link href={`/api/admin/blocks/${block.id}`}>#{block.id}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
