import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { conferencePackages } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { PackagesManager } from "@/app/admin/packages/packages-manager";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  await requireAdminPage(["content_manager"]);
  const db = getDb();
  const rows = await db
    .select()
    .from(conferencePackages)
    .orderBy(asc(conferencePackages.displayOrder));
  return (
    <div className="admin-page">
      <h1>Conference packages</h1>
      <p className="page-sub">
        Edit package names and descriptions in each language. Pricing and capacity
        stay shared.
      </p>
      <PackagesManager packages={rows} />
    </div>
  );
}
