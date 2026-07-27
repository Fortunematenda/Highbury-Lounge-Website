import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { conferencePackages } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { PackageForm } from "../package-form";

export const dynamic = "force-dynamic";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const db = getDb();
  const [row] = await db
    .select()
    .from(conferencePackages)
    .where(eq(conferencePackages.id, id))
    .limit(1);
  if (!row) notFound();

  return <PackageForm mode="edit" initial={row} />;
}
