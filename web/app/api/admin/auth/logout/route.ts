import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  applySessionCookie,
  destroySession,
  getSessionUser,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const token =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1) ?? undefined;

  const user = await getSessionUser(token);
  await destroySession(token);

  if (user) {
    await writeAuditLog({
      adminUserId: user.id,
      action: "admin.logout",
      entityType: "admin_user",
      entityId: user.id,
    });
  }

  const response = NextResponse.redirect(
    new URL("/admin/login", request.url),
    303,
  );
  applySessionCookie(response, "", 0);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
