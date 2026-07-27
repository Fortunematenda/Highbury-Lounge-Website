import { getDb } from "@/db";
import { roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { BlockCreateForm } from "../block-create-form";

export const dynamic = "force-dynamic";

export default async function NewBlockPage() {
  await requireAdminPage(["booking_manager", "content_manager"]);
  const db = getDb();
  const rooms = await db.select({ id: roomTypes.id, name: roomTypes.name }).from(roomTypes);
  return <BlockCreateForm rooms={rooms} />;
}
