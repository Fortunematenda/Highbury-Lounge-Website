import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { conferencePackages } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  await requireAdminPage(["content_manager"]);
  const db = getDb();
  const rows = await db.select().from(conferencePackages).orderBy(asc(conferencePackages.displayOrder));
  return (
    <div className="admin-page">
      <h1>Conference packages</h1>
      <section className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Capacity</th><th>Base price</th><th>Active</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.capacity}</td>
                <td>{r.basePrice != null ? formatMoney(r.basePrice) : "—"}</td>
                <td>{r.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
