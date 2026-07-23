import { eq, sql } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { conferencePackages } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { normalizeTranslationsJson } from "@/lib/i18n/content";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return jsonError("Invalid package id.", 400);

    const body = await request.json();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(conferencePackages)
      .where(eq(conferencePackages.id, id))
      .limit(1);
    if (!existing) return jsonError("Package not found.", 404);

    const name =
      body.name != null ? String(body.name).trim() : existing.name;
    if (!name) return jsonError("English name is required.", 400);

    const [row] = await db
      .update(conferencePackages)
      .set({
        name,
        description:
          body.description !== undefined
            ? String(body.description || "") || null
            : existing.description,
        capacity:
          body.capacity != null ? Number(body.capacity) : existing.capacity,
        basePrice:
          body.basePrice !== undefined
            ? body.basePrice === "" || body.basePrice == null
              ? null
              : Number(body.basePrice)
            : existing.basePrice,
        imageUrl:
          body.imageUrl !== undefined
            ? String(body.imageUrl || "") || null
            : existing.imageUrl,
        featuresJson:
          body.featuresJson !== undefined
            ? typeof body.featuresJson === "string"
              ? body.featuresJson
              : JSON.stringify(body.featuresJson ?? [])
            : existing.featuresJson,
        isActive:
          body.isActive !== undefined
            ? Boolean(body.isActive)
            : existing.isActive,
        displayOrder:
          body.displayOrder != null
            ? Number(body.displayOrder)
            : existing.displayOrder,
        translationsJson:
          body.translationsJson !== undefined
            ? (normalizeTranslationsJson(body.translationsJson) ?? null)
            : existing.translationsJson,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(conferencePackages.id, id))
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "conference.package_updated",
      entityType: "conference_package",
      entityId: id,
      details: { name },
    });

    return Response.json({ ok: true, package: row });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not update package.", 500);
  }
}
