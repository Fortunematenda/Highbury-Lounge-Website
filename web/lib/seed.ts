import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  amenities,
  conferencePackages,
  menuCategories,
  menuItems,
  roles,
  roomImages,
  roomTypeAmenities,
  roomTypes,
  siteSettings,
  adminUsers,
} from "@/db/schema";
import { hashPassword } from "@/lib/crypto";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { slugify } from "@/lib/slug";

const ROOM_GALLERY_EXTRAS = [
  "/images/garden.jpg",
  "/images/pool.jpg",
  "/images/dining.jpg",
  "/images/events.jpg",
  "/images/family-room.jpg",
  "/images/deluxe-room.jpg",
];

function roomGalleryUrls(featuredImage: string) {
  const urls = [featuredImage];
  for (const extra of ROOM_GALLERY_EXTRAS) {
    if (urls.length >= 6) break;
    if (!urls.includes(extra)) urls.push(extra);
  }
  return urls;
}

const ROOM_SEED = [
  {
    name: "Highbury Deluxe King",
    slug: "deluxe-double",
    shortDescription: "King bed - 2 guests - Breakfast included",
    description:
      "A restful king room with warm Highbury styling, ideal for couples and business travellers.",
    pricePerNight: 85,
    inventoryCount: 4,
    maxAdults: 2,
    maxChildren: 1,
    maxGuests: 2,
    bedType: "King",
    featuredImage: "/images/deluxe-room.jpg",
    amenities: ["Wi-Fi", "Secure parking", "Breakfast available", "Private bathroom"],
  },
  {
    name: "Garden Executive Twin",
    slug: "executive-twin",
    shortDescription: "2 double beds - 4 guests - Garden view",
    description:
      "Spacious twin/double layout overlooking the gardens — perfect for families and small groups.",
    pricePerNight: 110,
    inventoryCount: 3,
    maxAdults: 4,
    maxChildren: 2,
    maxGuests: 4,
    bedType: "2 Double",
    featuredImage: "/images/family-room.jpg",
    amenities: ["Wi-Fi", "Garden view", "Secure parking", "Breakfast available"],
  },
  {
    name: "Classic Queen Retreat",
    slug: "classic-queen",
    shortDescription: "Queen bed - 2 guests - Quiet garden wing",
    description: "A calm queen room in the quieter garden wing.",
    pricePerNight: 72,
    inventoryCount: 3,
    maxAdults: 2,
    maxChildren: 1,
    maxGuests: 2,
    bedType: "Queen",
    featuredImage: "/images/deluxe-room.jpg",
    amenities: ["Wi-Fi", "Secure parking", "Quiet wing"],
  },
  {
    name: "Highbury Signature Suite",
    slug: "signature-suite",
    shortDescription: "King bed - Lounge area - Premium breakfast",
    description: "Our signature suite with lounge space and premium touches.",
    pricePerNight: 135,
    promotionalPrice: 120,
    inventoryCount: 2,
    maxAdults: 2,
    maxChildren: 1,
    maxGuests: 2,
    bedType: "King",
    featuredImage: "/images/family-room.jpg",
    amenities: ["Wi-Fi", "Lounge area", "Premium breakfast", "Secure parking"],
  },
  {
    name: "Garden Family Residence",
    slug: "family-garden",
    shortDescription: "2 double beds - 4 guests - Garden access",
    description: "Family-friendly residence with direct garden access.",
    pricePerNight: 125,
    inventoryCount: 2,
    maxAdults: 4,
    maxChildren: 3,
    maxGuests: 4,
    bedType: "2 Double",
    featuredImage: "/images/family-room.jpg",
    amenities: ["Wi-Fi", "Garden access", "Family friendly", "Secure parking"],
  },
  {
    name: "Executive Business Studio",
    slug: "business-studio",
    shortDescription: "King bed - Work desk - High-speed Wi-Fi",
    description: "A productive studio with desk space and fast Wi-Fi for business stays.",
    pricePerNight: 95,
    inventoryCount: 3,
    maxAdults: 2,
    maxChildren: 0,
    maxGuests: 2,
    bedType: "King",
    featuredImage: "/images/deluxe-room.jpg",
    amenities: ["Wi-Fi", "Work desk", "Secure parking"],
  },
];

export async function seedDatabase(options?: {
  adminEmail?: string;
  adminPassword?: string;
}) {
  const db = getDb();

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const [existing] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    if (!existing) {
      await db.insert(siteSettings).values({ key, value });
    }
  }

  const roleSeed = [
    {
      key: "administrator",
      name: "Administrator",
      description: "Full access",
    },
    {
      key: "booking_manager",
      name: "Booking Manager",
      description: "Manage bookings, guests and availability",
    },
    {
      key: "content_manager",
      name: "Content Manager",
      description: "Manage rooms, prices, menus and website content",
    },
  ];

  for (const role of roleSeed) {
    const [existing] = await db
      .select()
      .from(roles)
      .where(eq(roles.key, role.key))
      .limit(1);
    if (!existing) await db.insert(roles).values(role);
  }

  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.key, "administrator"))
    .limit(1);

  const adminEmail = (options?.adminEmail || "admin@highbury.com").toLowerCase();
  const adminPassword = options?.adminPassword || "HighburyAdmin123!";
  const [existingAdmin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, adminEmail))
    .limit(1);

  if (!existingAdmin && adminRole) {
    const { hash, salt } = await hashPassword(adminPassword);
    await db.insert(adminUsers).values({
      email: adminEmail,
      fullName: "Highbury Administrator",
      passwordHash: hash,
      passwordSalt: salt,
      roleId: adminRole.id,
      isActive: true,
    });
  }

  const amenityNames = [
    "Wi-Fi",
    "Secure parking",
    "Breakfast available",
    "Private bathroom",
    "Garden view",
    "Quiet wing",
    "Lounge area",
    "Premium breakfast",
    "Garden access",
    "Family friendly",
    "Work desk",
  ];
  const amenityIds = new Map<string, number>();
  for (const name of amenityNames) {
    const [existing] = await db
      .select()
      .from(amenities)
      .where(eq(amenities.name, name))
      .limit(1);
    if (existing) {
      amenityIds.set(name, existing.id);
    } else {
      const [created] = await db.insert(amenities).values({ name }).returning();
      amenityIds.set(name, created.id);
    }
  }

  let order = 1;
  for (const room of ROOM_SEED) {
    const [existing] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.slug, room.slug))
      .limit(1);
    let roomId = existing?.id;
    if (!existing) {
      const [created] = await db
        .insert(roomTypes)
        .values({
          name: room.name,
          slug: room.slug,
          shortDescription: room.shortDescription,
          description: room.description,
          pricePerNight: room.pricePerNight,
          promotionalPrice:
            "promotionalPrice" in room
              ? (room as { promotionalPrice?: number }).promotionalPrice ?? null
              : null,
          inventoryCount: room.inventoryCount,
          maxAdults: room.maxAdults,
          maxChildren: room.maxChildren,
          maxGuests: room.maxGuests,
          bedType: room.bedType,
          featuredImage: room.featuredImage,
          isActive: true,
          isFeatured: order <= 2,
          displayOrder: order,
        })
        .returning();
      roomId = created.id;
      await db.insert(roomImages).values(
        roomGalleryUrls(room.featuredImage).map((url, index) => ({
          roomTypeId: created.id,
          url,
          altText: `${room.name} photo ${index + 1}`,
          displayOrder: index,
        })),
      );
    }
    if (roomId) {
      const existingImages = await db
        .select()
        .from(roomImages)
        .where(eq(roomImages.roomTypeId, roomId));
      if (existingImages.length < 5) {
        const have = new Set(existingImages.map((i) => i.url));
        let nextOrder = existingImages.length;
        for (const url of roomGalleryUrls(room.featuredImage)) {
          if (have.has(url)) continue;
          await db.insert(roomImages).values({
            roomTypeId: roomId,
            url,
            altText: `${room.name} photo ${nextOrder + 1}`,
            displayOrder: nextOrder,
          });
          have.add(url);
          nextOrder += 1;
          if (nextOrder >= 6) break;
        }
      }
      for (const amenityName of room.amenities) {
        const amenityId = amenityIds.get(amenityName);
        if (!amenityId) continue;
        const existingLinks = await db
          .select()
          .from(roomTypeAmenities)
          .where(eq(roomTypeAmenities.roomTypeId, roomId));
        if (!existingLinks.some((l) => l.amenityId === amenityId)) {
          await db.insert(roomTypeAmenities).values({
            roomTypeId: roomId,
            amenityId,
          });
        }
      }
    }
    order += 1;
  }

  const packages = [
    {
      name: "The Highbury Boardroom",
      slug: "highbury-boardroom",
      description:
        "A polished private setting for leadership meetings, interviews and focused strategy sessions.",
      capacity: 16,
      imageUrl: "/images/conference.jpg",
      featuresJson: JSON.stringify([
        "Boardroom seating",
        "Presentation screen",
        "High-speed Wi-Fi",
        "Tea and coffee service",
      ]),
    },
    {
      name: "Greenfield Conference Hall",
      slug: "greenfield-hall",
      description:
        "A flexible professional venue for workshops, presentations and company gatherings.",
      capacity: 80,
      imageUrl: "/images/events.jpg",
      featuresJson: JSON.stringify([
        "Flexible seating layouts",
        "Projector and screen",
        "PA system",
        "Catering available",
      ]),
    },
    {
      name: "The Garden Pavilion",
      slug: "garden-pavilion",
      description:
        "An airy indoor-outdoor setting for launches, networking sessions and relaxed corporate events.",
      capacity: 120,
      imageUrl: "/images/garden.jpg",
      featuresJson: JSON.stringify([
        "Indoor-outdoor layout",
        "Natural garden setting",
        "PA system",
        "Custom catering",
      ]),
    },
    {
      name: "Executive Strategy Suite",
      slug: "strategy-suite",
      description:
        "A comfortable premium space for planning days, private sessions and catered team meetings.",
      capacity: 30,
      imageUrl: "/images/dining.jpg",
      featuresJson: JSON.stringify([
        "Private meeting room",
        "Presentation screen",
        "Breakout space",
        "Executive catering",
      ]),
    },
  ];

  let pOrder = 1;
  for (const pkg of packages) {
    const [existing] = await db
      .select()
      .from(conferencePackages)
      .where(eq(conferencePackages.slug, pkg.slug))
      .limit(1);
    if (!existing) {
      await db.insert(conferencePackages).values({
        ...pkg,
        isActive: true,
        displayOrder: pOrder,
      });
    }
    pOrder += 1;
  }

  const categories = [
    { name: "Main meals", slug: "main-meals", itemType: "food" },
    { name: "Chef specials", slug: "chef-specials", itemType: "food" },
    { name: "Local favourites", slug: "local-favourites", itemType: "food" },
    { name: "Breakfast", slug: "breakfast", itemType: "food" },
    { name: "Drinks", slug: "drinks", itemType: "drink" },
    { name: "Extras", slug: "extras", itemType: "other" },
  ];
  const categoryIds = new Map<string, number>();
  let cOrder = 1;
  for (const cat of categories) {
    const [existing] = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.slug, cat.slug))
      .limit(1);
    if (existing) categoryIds.set(cat.slug, existing.id);
    else {
      const [created] = await db
        .insert(menuCategories)
        .values({
          name: cat.name,
          slug: cat.slug,
          itemType: cat.itemType,
          displayOrder: cOrder,
          isActive: true,
        })
        .returning();
      categoryIds.set(cat.slug, created.id);
    }
    cOrder += 1;
  }

  const foods = [
    {
      category: "main-meals",
      name: "Highbury Grilled Prawns",
      price: 18,
      imageUrl: "/images/food.jpg",
      description:
        "Seasoned grilled prawns served with rice, garden salad and house chilli sauce.",
    },
    {
      category: "chef-specials",
      name: "Highbury Loaded Bowl",
      price: 12,
      imageUrl: "/images/dining.jpg",
      description:
        "A generous house bowl layered with grilled favourites, fresh vegetables and chef's dressing.",
    },
    {
      category: "local-favourites",
      name: "Traditional Zimbabwean Plate",
      price: 10,
      imageUrl: "/images/food.jpg",
      description:
        "A comforting local-style meal with your choice of starch, seasonal vegetables and relish.",
    },
    {
      category: "breakfast",
      name: "Highbury Full Breakfast",
      price: 9,
      imageUrl: "/images/dining.jpg",
      description:
        "Eggs, sausage, toast, baked beans, grilled tomato and tea or coffee.",
    },
  ];

  let foodOrder = 1;
  for (const item of foods) {
    const categoryId = categoryIds.get(item.category);
    if (!categoryId) continue;
    const slug = slugify(item.name);
    const existingItems = await db.select().from(menuItems);
    const existingByName = existingItems.find((m) => m.name === item.name);
    if (existingByName) {
      if (!existingByName.slug) {
        await db
          .update(menuItems)
          .set({
            slug,
            shortDescription:
              existingByName.shortDescription || item.description.slice(0, 120),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(menuItems.id, existingByName.id));
      }
      continue;
    }
    const [existingBySlug] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.slug, slug))
      .limit(1);
    if (existingBySlug) continue;
    await db.insert(menuItems).values({
      categoryId,
      name: item.name,
      slug,
      shortDescription: item.description.slice(0, 120),
      description: item.description,
      price: item.price,
      currency: "USD",
      priceUnit: "per_serving",
      imageUrl: item.imageUrl,
      itemType: "food",
      isActive: true,
      isAvailable: true,
      allowPreOrder: true,
      publicVisible: true,
      displayOrder: foodOrder,
    });
    foodOrder += 1;
  }

  return {
    adminEmail,
    adminPassword: existingAdmin ? "(unchanged)" : adminPassword,
  };
}
