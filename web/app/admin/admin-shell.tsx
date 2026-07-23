"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminSessionUser } from "@/lib/auth";

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

export function AdminShell({
  user,
  children,
}: {
  user: AdminSessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className={`admin-shell${menuOpen ? " menu-open" : ""}`}>
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="admin-topbar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="admin-topbar-logo"
            src="/images/highbury-lounge-logo.png?v=4"
            alt=""
          />
          <span>Admin</span>
        </div>
        <span className="admin-topbar-user">{user.fullName}</span>
      </header>

      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside id="admin-sidebar" className="admin-sidebar">
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
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "is-active" : undefined}
              onClick={() => setMenuOpen(false)}
            >
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
