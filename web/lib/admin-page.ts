import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  getSessionUser,
  type AdminRoleKey,
  type AdminSessionUser,
} from "@/lib/auth";

export async function requireAdminPage(
  allowedRoles?: AdminRoleKey[],
): Promise<AdminSessionUser> {
  const jar = await cookies();
  const user = await getSessionUser(jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/admin/login");
  if (
    allowedRoles &&
    user.roleKey !== "administrator" &&
    !allowedRoles.includes(user.roleKey)
  ) {
    redirect("/admin");
  }
  return user;
}
