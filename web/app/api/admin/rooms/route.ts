import { asc, eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { roomTypes } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { slugify } from "@/lib/slug";

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const rows = await db
      .select()
      .from(roomTypes)
      .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));
    return Response.json({ rooms: rows });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load rooms.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("Name is required.", 400);

    const slug = String(body.slug ?? "").trim() || slugify(name);
    const pricePerNight = Number(body.pricePerNight);
    if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
      return jsonError("Valid price per night is required.", 400);
    }

    const db = getDb();
    const [row] = await db
      .insert(roomTypes)
      .values({
        name,
        slug,
        description: body.description ? String(body.description) : null,
        shortDescription: body.shortDescription
          ? String(body.shortDescription)
          : null,
        pricePerNight,
        promotionalPrice:
          body.promotionalPrice != null && body.promotionalPrice !== ""
            ? Number(body.promotionalPrice)
            : null,
        inventoryCount: Number(body.inventoryCount ?? 1),
        maxAdults: Number(body.maxAdults ?? 2),
        maxChildren: Number(body.maxChildren ?? 0),
        maxGuests: Number(body.maxGuests ?? 2),
        bedType: body.bedType ? String(body.bedType) : null,
        roomSize: body.roomSize ? String(body.roomSize) : null,
        featuredImage: body.featuredImage ? String(body.featuredImage) : null,
        isActive: body.isActive !== false && body.isActive !== "false",
        isFeatured: Boolean(body.isFeatured && body.isFeatured !== "false"),
        displayOrder: Number(body.displayOrder ?? 0),
      })
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "room.create",
      entityType: "room_type",
      entityId: row.id,
      details: { name, slug },
    });

    return Response.json({ ok: true, room: row }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not create room.", 500);
  }
}
