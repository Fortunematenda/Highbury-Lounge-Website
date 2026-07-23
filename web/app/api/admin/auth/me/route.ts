import { AuthError, requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/format";

export async function GET() {
  try {
    const user = await requireAdmin();
    return Response.json({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unauthorized", 401);
  }
}
