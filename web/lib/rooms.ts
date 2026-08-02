import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  amenities,
  roomImages,
  roomTypeAmenities,
  roomTypes,
} from "@/db/schema";
import {
  findAvailableRooms,
  nightsBetween,
  validateStayDates,
} from "@/lib/availability";
import { getSettingsMap } from "@/lib/settings";

export type PublicRoomImage = {
  id: string;
  url: string;
  alt: string | null;
};

export type PublicRoomDetail = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  pricePerNight: number;
  promotionalPrice: number | null;
  effectivePrice: number;
  currency: string;
  inventoryCount: number;
  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  bedType: string | null;
  roomSize: string | null;
  featuredImage: string;
  /** Flat URL list for compatibility */
  images: string[];
  gallery: PublicRoomImage[];
  amenities: string[];
  translationsJson: string | null;
  isFeatured: boolean;
};

export type PublicRoomSummary = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  effectivePrice: number;
  currency: string;
  maxGuests: number;
  bedType: string | null;
  roomSize: string | null;
  featuredImage: string;
  amenities: string[];
  isFeatured: boolean;
  translationsJson: string | null;
  roomsRemaining?: number;
  nights?: number;
  estimatedTotal?: number;
};

function buildGallery(
  featured: string | null | undefined,
  rows: Array<{ id: number; url: string; altText: string | null }>,
  roomName: string,
): PublicRoomImage[] {
  const seen = new Set<string>();
  const gallery: PublicRoomImage[] = [];

  if (featured?.trim()) {
    seen.add(featured);
    gallery.push({
      id: "featured",
      url: featured,
      alt: roomName,
    });
  }

  for (const row of rows) {
    if (!row.url?.trim() || seen.has(row.url)) continue;
    seen.add(row.url);
    gallery.push({
      id: String(row.id),
      url: row.url,
      alt: row.altText || roomName,
    });
  }

  if (gallery.length === 0) {
    gallery.push({
      id: "fallback",
      url: "/images/deluxe-room.jpg",
      alt: roomName,
    });
  }

  return gallery;
}

function effectivePriceFor(room: {
  pricePerNight: number;
  promotionalPrice: number | null;
}) {
  return room.promotionalPrice != null && room.promotionalPrice > 0
    ? room.promotionalPrice
    : room.pricePerNight;
}

async function amenitiesForRoom(roomTypeId: number): Promise<string[]> {
  const db = getDb();
  const amenityRows = await db
    .select({ name: amenities.name })
    .from(roomTypeAmenities)
    .innerJoin(amenities, eq(roomTypeAmenities.amenityId, amenities.id))
    .where(eq(roomTypeAmenities.roomTypeId, roomTypeId));
  return amenityRows.map((row) => row.name);
}

export async function getRoomBySlug(
  slug: string,
): Promise<PublicRoomDetail | null> {
  const db = getDb();
  const [room] = await db
    .select()
    .from(roomTypes)
    .where(and(eq(roomTypes.slug, slug), eq(roomTypes.isActive, true)))
    .limit(1);

  if (!room) return null;

  const [imageRows, amenityNames, settings] = await Promise.all([
    db
      .select()
      .from(roomImages)
      .where(eq(roomImages.roomTypeId, room.id))
      .orderBy(asc(roomImages.displayOrder), asc(roomImages.id)),
    amenitiesForRoom(room.id),
    getSettingsMap(),
  ]);

  const gallery = buildGallery(room.featuredImage, imageRows, room.name);

  return {
    id: room.id,
    slug: room.slug,
    name: room.name,
    shortDescription: room.shortDescription,
    description: room.description,
    pricePerNight: room.pricePerNight,
    promotionalPrice: room.promotionalPrice,
    effectivePrice: effectivePriceFor(room),
    currency: settings.currency || "USD",
    inventoryCount: room.inventoryCount,
    maxAdults: room.maxAdults,
    maxChildren: room.maxChildren,
    maxGuests: room.maxGuests,
    bedType: room.bedType,
    roomSize: room.roomSize,
    featuredImage: gallery[0].url,
    images: gallery.map((image) => image.url),
    gallery,
    amenities: amenityNames,
    translationsJson: room.translationsJson ?? null,
    isFeatured: room.isFeatured,
  };
}

export async function getPublicRooms(options?: {
  minGuests?: number;
}): Promise<PublicRoomSummary[]> {
  const db = getDb();
  const settings = await getSettingsMap();
  const currency = settings.currency || "USD";
  const minGuests = options?.minGuests ?? 1;

  const rooms = await db
    .select()
    .from(roomTypes)
    .where(
      and(eq(roomTypes.isActive, true), gte(roomTypes.maxGuests, minGuests)),
    )
    .orderBy(
      asc(roomTypes.displayOrder),
      asc(roomTypes.pricePerNight),
      asc(roomTypes.name),
    );

  const summaries: PublicRoomSummary[] = [];
  for (const room of rooms) {
    const [imageRows, amenityNames] = await Promise.all([
      db
        .select()
        .from(roomImages)
        .where(eq(roomImages.roomTypeId, room.id))
        .orderBy(asc(roomImages.displayOrder), asc(roomImages.id)),
      amenitiesForRoom(room.id),
    ]);
    const gallery = buildGallery(room.featuredImage, imageRows, room.name);

    summaries.push({
      id: room.id,
      slug: room.slug,
      name: room.name,
      shortDescription: room.shortDescription,
      effectivePrice: effectivePriceFor(room),
      currency,
      maxGuests: room.maxGuests,
      bedType: room.bedType,
      roomSize: room.roomSize,
      featuredImage: gallery[0].url,
      amenities: amenityNames,
      isFeatured: room.isFeatured,
      translationsJson: room.translationsJson ?? null,
    });
  }

  return summaries;
}

export async function listPublicRooms(filters?: {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}): Promise<{ rooms: PublicRoomSummary[]; error: string | null }> {
  const guests = Math.max(1, filters?.guests ?? 1);
  const checkIn = filters?.checkIn?.trim() || "";
  const checkOut = filters?.checkOut?.trim() || "";

  if (checkIn || checkOut) {
    const dateError = validateStayDates(checkIn, checkOut);
    if (dateError) {
      return { rooms: [], error: dateError };
    }

    try {
      const available = await findAvailableRooms({
        checkIn,
        checkOut,
        adults: guests,
        children: 0,
        roomsNeeded: 1,
      });

      const rooms: PublicRoomSummary[] = available.map((room) => ({
        id: room.id,
        slug: room.slug,
        name: room.name,
        shortDescription: room.shortDescription,
        effectivePrice: room.effectivePrice,
        currency: room.currency,
        maxGuests: room.maxGuests,
        bedType: room.bedType,
        roomSize: room.roomSize,
        featuredImage:
          room.featuredImage ||
          room.images[0] ||
          "/images/deluxe-room.jpg",
        amenities: room.amenities,
        isFeatured: false,
        translationsJson: room.translationsJson ?? null,
        roomsRemaining: room.roomsRemaining,
        nights: room.nights,
        estimatedTotal: room.estimatedTotal,
      }));

      // Preserve featured flags from DB for display
      const db = getDb();
      const featuredRows = await db
        .select({ id: roomTypes.id, isFeatured: roomTypes.isFeatured })
        .from(roomTypes)
        .where(eq(roomTypes.isActive, true));
      const featuredMap = new Map(
        featuredRows.map((row) => [row.id, row.isFeatured]),
      );
      for (const room of rooms) {
        room.isFeatured = featuredMap.get(room.id) ?? false;
      }

      return { rooms, error: null };
    } catch (error) {
      console.error(error);
      return {
        rooms: [],
        error: "Unable to check availability right now. Please try again.",
      };
    }
  }

  const rooms = await getPublicRooms({ minGuests: guests });
  return { rooms, error: null };
}

export async function getRelatedRooms(
  excludeId: number,
  limit = 3,
): Promise<PublicRoomSummary[]> {
  const rooms = await getPublicRooms();
  return rooms.filter((room) => room.id !== excludeId).slice(0, limit);
}

export { nightsBetween };
