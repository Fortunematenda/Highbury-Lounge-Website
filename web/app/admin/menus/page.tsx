import { requireAdminPage } from "@/lib/admin-page";
import { MenusManager } from "@/app/admin/menus/menus-manager";

export const dynamic = "force-dynamic";

export default async function MenusPage() {
  await requireAdminPage(["content_manager"]);
  return <MenusManager />;
}
