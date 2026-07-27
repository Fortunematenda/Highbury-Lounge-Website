import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { roomImages, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { EditRoomForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const { id } = await params;
  const roomId = Number(id);
  const db = getDb();
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.id, roomId))
    .limit(1);
  if (!room) notFound();

  const images = await db
    .select()
    .from(roomImages)
    .where(eq(roomImages.roomTypeId, roomId))
    .orderBy(asc(roomImages.displayOrder), asc(roomImages.id));

  return (
    <div className="admin-page">
      <h1>Edit {room.name}</h1>
      <EditRoomForm room={room} images={images} />
    </div>
  );
}
