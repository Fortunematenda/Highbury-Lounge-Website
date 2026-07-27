import { asc, eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { roomImages, roomTypes } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import {
  deleteStoredObject,
  storageKeyFromUploadUrl,
  storeUploadedImage,
  UploadError,
} from "@/lib/uploads";

async function listRoomImages(roomId: number) {
  const db = getDb();
  return db
    .select()
    .from(roomImages)
    .where(eq(roomImages.roomTypeId, roomId))
    .orderBy(asc(roomImages.displayOrder), asc(roomImages.id));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const roomId = Number((await context.params).id);
    if (!Number.isFinite(roomId)) return jsonError("Invalid room id.", 400);

    const db = getDb();
    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, roomId))
      .limit(1);
    if (!room) return jsonError("Room not found.", 404);

    const images = await listRoomImages(roomId);
    return Response.json({
      images,
      featuredImage: room.featuredImage,
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load room images.", 500);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const roomId = Number((await context.params).id);
    if (!Number.isFinite(roomId)) return jsonError("Invalid room id.", 400);

    const db = getDb();
    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, roomId))
      .limit(1);
    if (!room) return jsonError("Room not found.", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Image file is required.", 400);
    const setFeatured = String(form.get("featured") ?? "") === "1";

    const stored = await storeUploadedImage(file, "rooms");
    const existing = await listRoomImages(roomId);
    const makeFeatured = setFeatured || existing.length === 0 || !room.featuredImage;

    const [image] = await db
      .insert(roomImages)
      .values({
        roomTypeId: roomId,
        url: stored.imageUrl,
        altText: room.name,
        displayOrder: existing.length,
      })
      .returning();

    if (makeFeatured) {
      await db
        .update(roomTypes)
        .set({
          featuredImage: stored.imageUrl,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(roomTypes.id, roomId));
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "room.image_uploaded",
      entityType: "room_type",
      entityId: roomId,
      details: {
        imageId: image.id,
        storageKey: stored.storageKey,
        imageUrl: stored.imageUrl,
        featured: makeFeatured,
      },
    });

    const images = await listRoomImages(roomId);
    const [updated] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, roomId))
      .limit(1);

    return Response.json(
      {
        ok: true,
        image,
        images,
        featuredImage: updated?.featuredImage ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof UploadError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Image upload failed.", 500);
  }
}
