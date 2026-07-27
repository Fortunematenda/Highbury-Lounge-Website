import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomBlocks, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { BlockForm } from "./block-form";
import { BlocksList } from "./blocks-list";

export const dynamic = "force-dynamic";

export default async function AdminBlocksPage() {
  await requireAdminPage(["booking_manager", "content_manager"]);
  const db = getDb();
  const rooms = await db.select().from(roomTypes);
  const blocks = await db
    .select({
      id: roomBlocks.id,
      startDate: roomBlocks.startDate,
      endDate: roomBlocks.endDate,
      roomsBlocked: roomBlocks.roomsBlocked,
      reason: roomBlocks.reason,
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
      <BlocksList blocks={blocks} />
    </div>
  );
}
