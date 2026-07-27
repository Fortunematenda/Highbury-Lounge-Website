import { eq } from "drizzle-orm";
import { AuthError, canManageContent, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { conferencePackages } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";
import { normalizeTranslationsJson } from "@/lib/i18n/content";
import { slugify } from "@/lib/slug";

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator", "content_manager"]);
    if (!canManageContent(user.roleKey)) return jsonError("Forbidden", 403);

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("English name is required.", 400);

    const slugBase = slugify(String(body.slug || name)) || `package-${Date.now()}`;
    const db = getDb();

    let slug = slugBase;
    const existing = await db.select({ slug: conferencePackages.slug }).from(conferencePackages);
    const used = new Set(existing.map((r) => r.slug));
    let n = 2;
    while (used.has(slug)) {
      slug = `${slugBase}-${n}`;
      n += 1;
    }

    const [row] = await db
      .insert(conferencePackages)
      .values({
        name,
        slug,
        description: String(body.description ?? "").trim() || null,
        capacity: Number(body.capacity ?? 20) || 20,
        basePrice:
          body.basePrice === "" || body.basePrice == null
            ? null
            : Number(body.basePrice),
        imageUrl: String(body.imageUrl ?? "").trim() || null,
        featuresJson:
          body.featuresJson != null
            ? typeof body.featuresJson === "string"
              ? body.featuresJson
              : JSON.stringify(body.featuresJson ?? [])
            : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        displayOrder: Number(body.displayOrder ?? 0) || 0,
        translationsJson: normalizeTranslationsJson(body.translationsJson) ?? null,
      })
      .returning();

    await writeAuditLog({
      adminUserId: user.id,
      action: "conference.package_created",
      entityType: "conference_package",
      entityId: row.id,
      details: { name, slug },
    });

    return Response.json({ ok: true, package: row }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not create package.", 500);
  }
}
