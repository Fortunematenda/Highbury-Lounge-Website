import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomImages, roomTypes } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    const db = getDb();
    const rooms = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.isActive, true))
      .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));

    const images = await db
      .select()
      .from(roomImages)
      .orderBy(asc(roomImages.displayOrder), asc(roomImages.id));

    const imagesByRoom = new Map<number, string[]>();
    for (const image of images) {
      const list = imagesByRoom.get(image.roomTypeId) ?? [];
      list.push(image.url);
      imagesByRoom.set(image.roomTypeId, list);
    }

    const payload = rooms.map((room) => {
      const gallery = imagesByRoom.get(room.id) ?? [];
      const featured = room.featuredImage;
      const imagesList = [
        ...(featured ? [featured] : []),
        ...gallery.filter((url) => url !== featured),
      ];
      if (imagesList.length === 0) {
        imagesList.push("/images/deluxe-room.jpg");
      }

      return {
        id: room.id,
        slug: room.slug,
        name: room.name,
        shortDescription: room.shortDescription,
        description: room.description,
        pricePerNight: room.pricePerNight,
        promotionalPrice: room.promotionalPrice,
        maxGuests: room.maxGuests,
        bedType: room.bedType,
        featuredImage: imagesList[0],
        images: imagesList,
        translationsJson: room.translationsJson,
        isFeatured: room.isFeatured,
        displayOrder: room.displayOrder,
      };
    });

    return Response.json(
      { rooms: payload },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(error);
    return jsonError("Unable to load rooms.", 500);
  }
}
