import { requireAdminPage } from "@/lib/admin-page";
import { MenuCategoryForm } from "../../menu-category-form";
import type { MenuItemType } from "@/lib/menu-constants";
import { MENU_ITEM_TYPES } from "@/lib/menu-constants";

export const dynamic = "force-dynamic";

export default async function NewMenuCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const params = await searchParams;
  const type = params.type;
  const defaultItemType =
    type && MENU_ITEM_TYPES.includes(type as MenuItemType)
      ? (type as MenuItemType)
      : undefined;

  return <MenuCategoryForm mode="create" defaultItemType={defaultItemType} />;
}
