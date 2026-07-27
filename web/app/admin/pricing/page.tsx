import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pricingRules, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { PricingLists } from "./pricing-lists";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  await requireAdminPage(["content_manager"]);
  const db = getDb();
  const rooms = await db.select().from(roomTypes);
  const rules = await db
    .select({
      id: pricingRules.id,
      name: pricingRules.name,
      roomName: roomTypes.name,
      ruleType: pricingRules.ruleType,
      amount: pricingRules.amount,
      isPercentage: pricingRules.isPercentage,
      isActive: pricingRules.isActive,
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
      <PricingLists rooms={rooms} rules={rules} />
    </div>
  );
}
