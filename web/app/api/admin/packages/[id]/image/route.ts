import { eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { conferencePackages } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import {
  deleteStoredObject,
  storageKeyFromUploadUrl,
  storeUploadedImage,
  UploadError,
} from "@/lib/uploads";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid package id.", 400);

    const db = getDb();
    const [existing] = await db
      .select()
      .from(conferencePackages)
      .where(eq(conferencePackages.id, id))
      .limit(1);
    if (!existing) return jsonError("Package not found.", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Image file is required.", 400);

    const uploaded = await storeUploadedImage(file, "packages");
    const oldKey = storageKeyFromUploadUrl(existing.imageUrl);

    const [row] = await db
      .update(conferencePackages)
      .set({
        imageUrl: uploaded.imageUrl,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(conferencePackages.id, id))
      .returning();

    if (oldKey) await deleteStoredObject(oldKey);

    await writeAuditLog({
      adminUserId: user.id,
      action: "conference.package_image",
      entityType: "conference_package",
      entityId: id,
      details: { imageUrl: uploaded.imageUrl },
    });

    return Response.json({ ok: true, package: row });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof UploadError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not upload package image.", 500);
  }
}
