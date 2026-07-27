import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { RoomsList } from "./rooms-list";

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
          Add room
        </Link>
      </header>
      <RoomsList rooms={rooms} />
    </div>
  );
}
