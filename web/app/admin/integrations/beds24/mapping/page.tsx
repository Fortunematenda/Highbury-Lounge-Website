import { asc, eq } from "drizzle-orm";
import { Link2 } from "lucide-react";
import { getDb } from "@/db";
import { channelRoomMappings, roomTypes } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { BEDS24_PROVIDER, getBeds24Config } from "@/lib/channel-manager";
import {
  DetailPageShell,
  DetailSectionCard,
} from "@/app/admin/components/detail-page";
import { Beds24MappingClient, type MappingRow } from "./mapping-client";

export const dynamic = "force-dynamic";

export default async function Beds24MappingPage() {
  await requireAdminPage(["administrator"]);
  const config = getBeds24Config();
  const db = getDb();
  const rooms = await db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      isActive: roomTypes.isActive,
    })
    .from(roomTypes)
    .orderBy(asc(roomTypes.displayOrder), asc(roomTypes.name));
  const mappings = await db
    .select()
    .from(channelRoomMappings)
    .where(eq(channelRoomMappings.provider, BEDS24_PROVIDER));
  const byLocal = new Map(mappings.map((m) => [m.localRoomTypeId, m]));

  const initialRows: MappingRow[] = rooms.map((room) => {
    const m = byLocal.get(room.id);
    return {
      localRoomTypeId: room.id,
      localRoomName: room.name,
      isActive: room.isActive,
      mappingId: m?.id ?? null,
      externalPropertyId: m?.externalPropertyId ?? config.propertyId ?? "",
      externalRoomId: m?.externalRoomId ?? "",
      externalRoomName: m?.externalRoomName ?? "",
      externalRatePlanId: m?.externalRatePlanId ?? "",
      enabled: m?.enabled ?? false,
      status: m?.externalRoomId ? (m.enabled ? "Mapped" : "Error") : "Not Mapped",
    };
  });

  return (
    <DetailPageShell
      pageTitle="Room mapping"
      breadcrumbs={[
        { label: "Beds24", href: "/admin/integrations/beds24" },
        { label: "Room mapping" },
      ]}
      title="Beds24 room mapping"
      description="Map Highbury room types to Beds24 rooms and optional rate plans. IDs stay empty until account verification."
      backAction={{
        label: "Back to Beds24",
        href: "/admin/integrations/beds24",
      }}
    >
      <DetailSectionCard title="Mappings" icon={Link2}>
        <Beds24MappingClient
          defaultPropertyId={config.propertyId}
          initialRows={initialRows}
        />
      </DetailSectionCard>
    </DetailPageShell>
  );
}
