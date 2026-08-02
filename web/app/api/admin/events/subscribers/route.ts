import { and, desc, eq, like } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { eventSubscribers } from "@/db/schema";
import { jsonError } from "@/lib/format";

export async function GET(request: Request) {
  try {
    await requireAdmin(["administrator", "content_manager"]);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
    const pageSize = 50;
    const db = getDb();
    const filters = [];
    if (status === "active" || status === "unsubscribed") {
      filters.push(eq(eventSubscribers.status, status));
    }
    if (q) filters.push(like(eventSubscribers.email, `%${q}%`));

    const rows = await db
      .select()
      .from(eventSubscribers)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(eventSubscribers.subscribedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return Response.json({ subscribers: rows, page, pageSize });
  } catch (error) {
    if (error instanceof AuthError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("Unable to load subscribers.", 500);
  }
}
