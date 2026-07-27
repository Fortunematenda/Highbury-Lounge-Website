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
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      slug: roomTypes.slug,
      shortDescription: roomTypes.shortDescription,
      pricePerNight: roomTypes.pricePerNight,
      promotionalPrice: roomTypes.promotionalPrice,
      inventoryCount: roomTypes.inventoryCount,
      maxGuests: roomTypes.maxGuests,
      bedType: roomTypes.bedType,
      featuredImage: roomTypes.featuredImage,
      isActive: roomTypes.isActive,
      isFeatured: roomTypes.isFeatured,
    })
    .from(roomTypes)
    .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));

  return <RoomsList rooms={rooms} />;
}
