import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomBlocks, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { BlocksList } from "./blocks-list";

export const dynamic = "force-dynamic";

export default async function AdminBlocksPage() {
  await requireAdminPage(["booking_manager", "content_manager"]);
  const db = getDb();
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
          <p className="page-sub">
            Maintenance, private use and manual holds reduce availability
          </p>
        </div>
        <Link className="admin-btn" href="/admin/blocks/new">
          Create block
        </Link>
      </header>
      <BlocksList blocks={blocks} />
    </div>
  );
}
