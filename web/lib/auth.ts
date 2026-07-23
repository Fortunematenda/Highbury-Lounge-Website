import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { adminSessions, adminUsers, roles } from "@/db/schema";
import { randomToken, sha256Hex, verifyPassword } from "@/lib/crypto";

export const SESSION_COOKIE = "hl_admin_session";
const SESSION_DAYS = 7;

export type AdminRoleKey =
  | "administrator"
  | "booking_manager"
  | "content_manager";

export type AdminSessionUser = {
  id: number;
  email: string;
  fullName: string;
  roleKey: AdminRoleKey;
  roleName: string;
};

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AdminSessionUser | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      passwordHash: adminUsers.passwordHash,
      passwordSalt: adminUsers.passwordSalt,
      isActive: adminUsers.isActive,
      roleKey: roles.key,
      roleName: roles.name,
    })
    .from(adminUsers)
    .innerJoin(roles, eq(adminUsers.roleId, roles.id))
    .where(eq(adminUsers.email, email.trim().toLowerCase()))
    .limit(1);

  if (!row || !row.isActive) return null;
  const ok = await verifyPassword(password, row.passwordHash, row.passwordSalt);
  if (!ok) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    roleKey: row.roleKey as AdminRoleKey,
    roleName: row.roleName,
  };
}

export async function createSession(adminUserId: number): Promise<string> {
  const db = getDb();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);

  await db.insert(adminSessions).values({
    adminUserId,
    tokenHash,
    expiresAt: expires.toISOString(),
  });

  return token;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
}

export async function getSessionUser(
  token?: string | null,
): Promise<AdminSessionUser | null> {
  if (!token) return null;
  const db = getDb();
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();

  const [row] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      isActive: adminUsers.isActive,
      roleKey: roles.key,
      roleName: roles.name,
      expiresAt: adminSessions.expiresAt,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .innerJoin(roles, eq(adminUsers.roleId, roles.id))
    .where(
      and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, now)),
    )
    .limit(1);

  if (!row || !row.isActive) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    roleKey: row.roleKey as AdminRoleKey,
    roleName: row.roleName,
  };
}

export async function requireAdmin(
  allowedRoles?: AdminRoleKey[],
): Promise<AdminSessionUser> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  if (allowedRoles && !allowedRoles.includes(user.roleKey)) {
    if (user.roleKey !== "administrator") {
      throw new AuthError("Forbidden", 403);
    }
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function canManageBookings(role: AdminRoleKey) {
  return role === "administrator" || role === "booking_manager";
}

export function canManageContent(role: AdminRoleKey) {
  return role === "administrator" || role === "content_manager";
}

export function sessionCookieOptions(token: string, maxAgeSeconds = SESSION_DAYS * 86400) {
  // Opt-in only. Default false so plain HTTP deploys (e.g. http://IP:8095)
  // can keep the session cookie. Set COOKIE_SECURE=true behind HTTPS.
  // Workers often do not see Docker env unless bound as wrangler vars — keep default false.
  const secure =
    process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1";

  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Attach session cookie on the response (required for Wrangler/Workers). */
export function applySessionCookie(
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options?: {
          httpOnly?: boolean;
          sameSite?: "lax" | "strict" | "none";
          secure?: boolean;
          path?: string;
          maxAge?: number;
        },
      ) => void;
    };
  },
  token: string,
  maxAgeSeconds = SESSION_DAYS * 86400,
) {
  const opts = sessionCookieOptions(token, maxAgeSeconds);
  response.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return response;
}
