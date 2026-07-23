import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pricingRules, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  await requireAdminPage(["content_manager"]);
  const db = getDb();
  const rooms = await db.select().from(roomTypes);
  const rules = await db
    .select({
      rule: pricingRules,
      roomName: roomTypes.name,
    })
    .from(pricingRules)
    .leftJoin(roomTypes, eq(pricingRules.roomTypeId, roomTypes.id))
    .orderBy(desc(pricingRules.createdAt));

  return (
    <div className="admin-page">
      <h1>Pricing</h1>
      <p className="page-sub">
        Standard and promotional prices live on each room type. Pricing rules support seasonal/weekend/extra guest charges.
      </p>
      <section className="admin-card">
        <h2>Room nightly rates</h2>
        <table className="admin-table">
          <thead>
            <tr><th>Room</th><th>Standard</th><th>Promo</th></tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td><a href={`/admin/rooms/${r.id}`}>{r.name}</a></td>
                <td>{formatMoney(r.pricePerNight)}</td>
                <td>{r.promotionalPrice != null ? formatMoney(r.promotionalPrice) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="admin-card">
        <h2>Pricing rules</h2>
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Room</th><th>Type</th><th>Amount</th><th>Active</th></tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr><td colSpan={5}>No pricing rules yet.</td></tr>
            ) : (
              rules.map(({ rule, roomName }) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{roomName || "All"}</td>
                  <td>{rule.ruleType}</td>
                  <td>{rule.isPercentage ? `${rule.amount}%` : formatMoney(rule.amount)}</td>
                  <td>{rule.isActive ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
