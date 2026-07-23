import { and, asc, count, eq, isNotNull, isNull } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { menuCategories, menuItems } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    const [totalItems] = await db
      .select({ value: count() })
      .from(menuItems)
      .where(isNull(menuItems.archivedAt));
    const [activeItems] = await db
      .select({ value: count() })
      .from(menuItems)
      .where(and(isNull(menuItems.archivedAt), eq(menuItems.isActive, true)));
    const [unavailable] = await db
      .select({ value: count() })
      .from(menuItems)
      .where(
        and(isNull(menuItems.archivedAt), eq(menuItems.isAvailable, false)),
      );
    const [categories] = await db
      .select({ value: count() })
      .from(menuCategories)
      .where(isNull(menuCategories.archivedAt));
    const [featured] = await db
      .select({ value: count() })
      .from(menuItems)
      .where(and(isNull(menuItems.archivedAt), eq(menuItems.isFeatured, true)));
    const [archived] = await db
      .select({ value: count() })
      .from(menuItems)
      .where(isNotNull(menuItems.archivedAt));

    return Response.json({
      stats: {
        totalItems: totalItems?.value ?? 0,
        activeItems: activeItems?.value ?? 0,
        unavailableItems: unavailable?.value ?? 0,
        totalCategories: categories?.value ?? 0,
        featuredItems: featured?.value ?? 0,
        archivedItems: archived?.value ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Failed to load menu stats.", 500);
  }
}
