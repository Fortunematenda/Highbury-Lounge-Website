import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { setSetting } from "@/lib/settings";
import {
  deleteStoredObject,
  storageKeyFromUploadUrl,
  storeUploadedImage,
  UploadError,
} from "@/lib/uploads";

const MEDIA_KEYS = new Set([
  "hero_image",
  "meet_image",
  "celebrate_image",
  "dine_image_1",
  "dine_image_2",
]);

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const form = await request.formData();
    const key = String(form.get("key") ?? "").trim();
    if (!MEDIA_KEYS.has(key)) return jsonError("Invalid media key.", 400);
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Image file is required.", 400);
    const previousUrl = String(form.get("previousUrl") ?? "").trim();

    const uploaded = await storeUploadedImage(file, "site");
    await setSetting(key, uploaded.imageUrl);

    const oldKey = storageKeyFromUploadUrl(previousUrl);
    if (oldKey) await deleteStoredObject(oldKey);

    await writeAuditLog({
      adminUserId: user.id,
      action: "site.media_updated",
      entityType: "site_settings",
      details: { key, imageUrl: uploaded.imageUrl },
    });

    return Response.json({ ok: true, key, imageUrl: uploaded.imageUrl });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    if (error instanceof UploadError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not upload site media.", 500);
  }
}
