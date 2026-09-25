import { AuthError, requireAdmin } from "@/lib/auth";
import { listChannelSyncLogs, BEDS24_PROVIDER } from "@/lib/channel-manager";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await requireAdmin(["administrator", "booking_manager"]);
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const logs = await listChannelSyncLogs({
      provider: BEDS24_PROVIDER,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    return Response.json({ logs });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    return jsonError("Unable to load sync logs.", 500);
  }
}
