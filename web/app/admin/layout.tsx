import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  SESSION_COOKIE,
  getSessionUser,
  type AdminSessionUser,
} from "@/lib/auth";
import "./admin.css";

export const metadata = {
  title: "Admin · Highbury Lounge",
};

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/blocks", label: "Blocks" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/conference", label: "Conference" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/menus", label: "Menus" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/settings", label: "Settings" },
] as const;

function isLoginPath(pathname: string) {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}

async function resolvePathname() {
  const h = await headers();
  const candidates = [
    h.get("x-matched-path"),
    h.get("x-invoke-path"),
    h.get("x-pathname"),
    h.get("next-url"),
    h.get("x-url"),
    h.get("x-forwarded-uri"),
    h.get("x-original-url"),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      if (raw.startsWith("http")) return new URL(raw).pathname;
      if (raw.startsWith("/")) return raw.split("?")[0];
    } catch {
      /* ignore */
    }
  }
  return "";
}

function AdminShell({
  user,
  children,
}: {
  user: AdminSessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="admin-brand-logo"
            src="/images/highbury-lounge-logo-light.png?v=4"
            alt="Highbury Lounge"
          />
          <span>Admin portal</span>
        </div>
        <nav className="admin-nav" aria-label="Admin">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-user">
          <p>
            <strong>{user.fullName}</strong>
            {user.roleName}
            <br />
            {user.email}
          </p>
          <form action="/api/admin/auth/logout" method="post">
            <button type="submit" className="admin-logout">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  const pathname = await resolvePathname();
  const onLogin = isLoginPath(pathname);

  if (!user) {
    // Login renders without shell; protected pages call requireAdminPage()
    if (pathname && !onLogin) {
      redirect("/admin/login");
    }
    return <>{children}</>;
  }

  if (onLogin) {
    redirect("/admin");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
