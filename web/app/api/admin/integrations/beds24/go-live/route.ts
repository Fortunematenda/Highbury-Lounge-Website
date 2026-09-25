import { AuthError, requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  applyRecommendedGardenViewMapping,
  getBeds24GoLiveReadiness,
} from "@/lib/channel-manager/go-live";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    await requireAdmin(["administrator", "booking_manager"]);
    const readiness = await getBeds24GoLiveReadiness();
    return Response.json(readiness);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Unable to load go-live readiness.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(["administrator"]);
    const body = await request.json().catch(() => ({}));
    if (body?.action !== "apply_garden_mapping") {
      return jsonError("Unsupported action.", 400);
    }

    const result = await applyRecommendedGardenViewMapping();
    if (!result.ok) {
      return jsonError(result.message, 404);
    }

    await writeAuditLog({
      adminUserId: user.id,
      action: "beds24.mapping.recommended",
      entityType: "channel_room_mapping",
      entityId: result.mappingId,
      details: {
        localRoomTypeId: result.localRoomTypeId,
        externalRoomId: result.externalRoomId,
      },
    });

    const readiness = await getBeds24GoLiveReadiness();
    return Response.json({ ...result, readiness });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Could not apply recommended mapping.", 500);
  }
}
