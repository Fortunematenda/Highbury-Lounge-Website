import { AuthError, requireAdmin } from "@/lib/auth";
import { reconcileChannelBookings } from "@/lib/channel-manager";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    await requireAdmin(["administrator", "booking_manager"]);
    const result = await reconcileChannelBookings();
    return Response.json(result);
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError(
      error instanceof Error ? error.message : "Reconciliation failed.",
      500,
    );
  }
}
