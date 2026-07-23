import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  destroySession,
  getSessionUser,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  await destroySession(token);
  jar.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  if (user) {
    await writeAuditLog({
      adminUserId: user.id,
      action: "admin.logout",
      entityType: "admin_user",
      entityId: user.id,
    });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
