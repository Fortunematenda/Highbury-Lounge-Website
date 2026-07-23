import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminUsers, roles } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdminPage(["administrator"]);
  const db = getDb();
  const users = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      isActive: adminUsers.isActive,
      roleName: roles.name,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .innerJoin(roles, eq(adminUsers.roleId, roles.id));

  return (
    <div className="admin-page">
      <h1>Admin users</h1>
      <section className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last login</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.roleName}</td>
                <td>{u.isActive ? "Yes" : "No"}</td>
                <td>{u.lastLoginAt || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
