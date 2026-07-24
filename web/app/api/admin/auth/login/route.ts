import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  AuthError,
  applySessionCookie,
  authenticateAdmin,
  createSession,
} from "@/lib/auth";
import { getDb } from "@/db";
import { adminUsers } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/format";

async function readCredentials(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    return {
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      mode: "json" as const,
    };
  }

  const form = await request.formData();
  return {
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    mode: "form" as const,
  };
}

export async function POST(request: Request) {
  try {
    const { email, password, mode } = await readCredentials(request);
    if (!email.trim() || !password) {
      if (mode === "form") {
        return NextResponse.redirect(
          new URL("/admin/login?error=missing", request.url),
          303,
        );
      }
      return jsonError("Email and password are required.", 400);
    }

    const user = await authenticateAdmin(email, password);
    if (!user) {
      if (mode === "form") {
        return NextResponse.redirect(
          new URL("/admin/login?error=invalid", request.url),
          303,
        );
      }
      return jsonError("Invalid email or password.", 401);
    }

    const token = await createSession(user.id);

    const db = getDb();
    await db
      .update(adminUsers)
      .set({
        lastLoginAt: new Date().toISOString(),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(adminUsers.id, user.id));

    await writeAuditLog({
      adminUserId: user.id,
      action: "admin.login",
      entityType: "admin_user",
      entityId: user.id,
    });

    if (mode === "form") {
      const response = NextResponse.redirect(
        new URL("/admin", request.url),
        303,
      );
      applySessionCookie(response, token);
      return response;
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleKey: user.roleKey,
        roleName: user.roleName,
      },
    });
    applySessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Login failed.", 500);
  }
}
