import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { roomImages, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatAuditActorLabel, getLatestEntityChange } from "@/lib/audit";
import { formatMoney } from "@/lib/format";
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
  if (!Number.isFinite(roomId)) notFound();

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

  const cover =
    room.featuredImage || images.find((img) => img.url)?.url || null;

  const lastChange = await getLatestEntityChange("room_type", roomId);

  return (
    <EditRoomForm
      room={room}
      images={images}
      coverUrl={cover}
      summary={{
        rateLabel:
          room.promotionalPrice != null && room.promotionalPrice > 0
            ? `${formatMoney(room.promotionalPrice)} / night`
            : `${formatMoney(room.pricePerNight)} / night`,
        inventory: room.inventoryCount,
        maxGuests: room.maxGuests,
        photoCount: images.length,
        updatedAt: room.updatedAt,
        createdAt: room.createdAt,
        lastChangedBy: lastChange
          ? formatAuditActorLabel(lastChange.actor)
          : null,
        lastChangedAt: lastChange?.createdAt ?? null,
        lastChangedEmail: lastChange?.actor?.email ?? null,
      }}
    />
  );
}
