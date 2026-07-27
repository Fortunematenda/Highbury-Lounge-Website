import { asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { menuCategories, menuItemImages, menuItems } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatAuditActorLabel, getLatestEntityChange } from "@/lib/audit";
import { MenuItemForm } from "../../menu-item-form";

export const dynamic = "force-dynamic";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const db = getDb();
  const [item] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);
  if (!item) notFound();

  const images = await db
    .select()
    .from(menuItemImages)
    .where(eq(menuItemImages.menuItemId, id))
    .orderBy(asc(menuItemImages.displayOrder));

  const categories = await db
    .select({ id: menuCategories.id, name: menuCategories.name })
    .from(menuCategories)
    .where(isNull(menuCategories.archivedAt))
    .orderBy(asc(menuCategories.displayOrder));

  const lastChange = await getLatestEntityChange("menu_item", id);

  return (
    <MenuItemForm
      mode="edit"
      categories={categories}
      initial={{ ...item, images }}
      lastChange={
        lastChange
          ? {
              label: formatAuditActorLabel(lastChange.actor),
              email: lastChange.actor?.email ?? null,
              at: lastChange.createdAt,
            }
          : null
      }
    />
  );
}
