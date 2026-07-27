import { asc } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { galleryImages } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { storeUploadedImage, UploadError } from "@/lib/uploads";

export async function GET() {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const db = getDb();
    const images = await db
      .select()
      .from(galleryImages)
      .orderBy(asc(galleryImages.displayOrder), asc(galleryImages.id));
    return Response.json({ images });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Unable to load gallery.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Image file is required.", 400);
    const altText = String(form.get("altText") ?? "").trim() || null;
    const displayOrder = Number(form.get("displayOrder") ?? 0) || 0;

    const uploaded = await storeUploadedImage(file, "gallery");
    const db = getDb();
    const [row] = await db
      .insert(galleryImages)
      .values({
        imageUrl: uploaded.imageUrl,
        altText,
        displayOrder,
        isActive: true,
      })
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "gallery.image_created",
      entityType: "gallery_image",
      entityId: row.id,
      details: { imageUrl: row.imageUrl },
    });

    return Response.json({ ok: true, image: row }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof UploadError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not add gallery image.", 500);
  }
}
