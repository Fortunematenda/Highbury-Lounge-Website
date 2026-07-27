import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { menuCategories } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { MenuCategoryForm } from "../../menu-category-form";

export const dynamic = "force-dynamic";

export default async function EditMenuCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const db = getDb();
  const [category] = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.id, id))
    .limit(1);
  if (!category) notFound();

  return <MenuCategoryForm mode="edit" initial={category} />;
}
