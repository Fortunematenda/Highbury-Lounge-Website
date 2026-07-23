import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import {
  AuthError,
  authenticateAdmin,
  createSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { getDb } from "@/db";
import { adminUsers } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    if (!email.trim() || !password) {
      return jsonError("Email and password are required.", 400);
    }

    const user = await authenticateAdmin(email, password);
    if (!user) {
      return jsonError("Invalid email or password.", 401);
    }

    const token = await createSession(user.id);
    const jar = await cookies();
    const opts = sessionCookieOptions(token);
    jar.set(opts);

    const db = getDb();
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date().toISOString(), updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(adminUsers.id, user.id));

    await writeAuditLog({
      adminUserId: user.id,
      action: "admin.login",
      entityType: "admin_user",
      entityId: user.id,
    });

    return Response.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleKey: user.roleKey,
        roleName: user.roleName,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Login failed.", 500);
  }
}
