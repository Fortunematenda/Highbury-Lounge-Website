import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { AdminShell } from "@/app/admin/admin-shell";
import "./admin.css";

export const metadata = {
  title: "Admin · Highbury Lounge",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
  },
};

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
