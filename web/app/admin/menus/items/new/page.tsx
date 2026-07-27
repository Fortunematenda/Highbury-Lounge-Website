import { asc, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { menuCategories } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { MenuItemForm } from "../../menu-item-form";

export const dynamic = "force-dynamic";

export default async function NewMenuItemPage() {
  await requireAdminPage(["content_manager"]);
  const db = getDb();
  const categories = await db
    .select({ id: menuCategories.id, name: menuCategories.name })
    .from(menuCategories)
    .where(isNull(menuCategories.archivedAt))
    .orderBy(asc(menuCategories.displayOrder));

  return <MenuItemForm mode="create" categories={categories} />;
}
