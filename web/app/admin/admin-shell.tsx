"use client";

import AdminLink from "@/app/admin/components/AdminLink";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackLink,
  adminBackHref,
  adminBackLabel,
} from "@/app/components/BackLink";
import type { AdminSessionUser } from "@/lib/auth";
import { AdminBrandLogo } from "@/app/admin/components/AdminBrandLogo";
import { AdminGlobalSearch } from "@/app/admin/components/AdminGlobalSearch";
import { AdminNotificationsBell } from "@/app/admin/components/AdminNotificationsBell";
import { resolveAdminRouteMeta } from "@/app/admin/lib/admin-route-meta";
import { Toaster } from "sonner";
import {
  BarChart3,
  BedDouble,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  GalleryHorizontal,
  LayoutDashboard,
  LineChart,
  LogOut,
  Mail,
  Menu,
  Package,
  Settings,
  Shield,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  Users,
  Wallet,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  badgeKey?: "notifications";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: Bell,
        badgeKey: "notifications",
      },
    ],
  },
  {
    label: "Stay",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/admin/rooms", label: "Rooms", icon: BedDouble },
      { href: "/admin/blocks", label: "Blocks", icon: CalendarOff },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/guests", label: "Guests", icon: Users },
    ],
  },
  {
    label: "Dining",
    items: [
      { href: "/admin/food-orders", label: "Food Orders", icon: UtensilsCrossed },
      { href: "/admin/menus", label: "Menus", icon: BookOpen },
    ],
  },
  {
    label: "Events",
    items: [
      { href: "/admin/events", label: "Events", icon: Sparkles },
      { href: "/admin/events/tickets", label: "Tickets", icon: Ticket },
      {
        href: "/admin/events/reservations",
        label: "Reservations",
        icon: ClipboardList,
      },
      {
        href: "/admin/events/subscribers",
        label: "Subscribers",
        icon: Mail,
      },
    ],
  },
  {
    label: "Conference",
    items: [
      { href: "/admin/conference", label: "Requests", icon: Building2 },
      { href: "/admin/packages", label: "Packages", icon: Package },
    ],
  },
  {
    label: "Website",
    items: [{ href: "/admin/gallery", label: "Gallery", icon: GalleryHorizontal }],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/analytics", label: "Analytics", icon: LineChart },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/audit", label: "Audit", icon: Shield },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL_NAV_HREFS = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => item.href),
);

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminShell({
  user,
  children,
}: {
  user: AdminSessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [overrideTitle, setOverrideTitle] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const backHref = adminBackHref(pathname);
  const backLabel = adminBackLabel(pathname);
  const routeMeta = useMemo(() => resolveAdminRouteMeta(pathname), [pathname]);
  const title = overrideTitle || routeMeta.title;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOverrideTitle(null));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    function onTitle(event: Event) {
      const custom = event as CustomEvent<{ title?: string }>;
      if (custom.detail?.title) setOverrideTitle(custom.detail.title);
    }
    window.addEventListener("admin:page-title", onTitle);
    return () => window.removeEventListener("admin:page-title", onTitle);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMenuOpen(false);
      setProfileOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setCollapsed(localStorage.getItem("admin-sidebar-collapsed") === "1");
      } catch {
        /* ignore */
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const res = await fetch("/api/admin/notifications?limit=1", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setUnreadNotifications(Number(data.unreadCount ?? 0));
        }
      } catch {
        /* ignore */
      }
    }
    const start = window.setTimeout(() => void loadUnread(), 0);
    const timer = window.setInterval(() => void loadUnread(), 45000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, []);

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

  useEffect(() => {
    if (!profileOpen) return;
    function onPointer(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    // Prefer the longest matching nav href so /admin/events/tickets
    // does not also light up the parent Events item.
    const matches = ALL_NAV_HREFS.filter(
      (candidate) =>
        candidate !== "/admin" &&
        (pathname === candidate || pathname.startsWith(`${candidate}/`)),
    );
    if (matches.length === 0) return false;
    const best = matches.reduce((a, b) => (a.length >= b.length ? a : b));
    return best === href;
  }

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("admin-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div
      className={`admin-shell${menuOpen ? " menu-open" : ""}${collapsed ? " is-collapsed" : ""}`}
    >
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside id="admin-sidebar" className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand">
          <AdminBrandLogo />
          <span className="admin-brand-text">Admin portal</span>
        </div>

        <a
          className="admin-view-website"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="View Website"
        >
          <ExternalLink size={16} aria-hidden />
          <span>View Website</span>
        </a>

        <nav className="admin-nav" aria-label="Admin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="admin-nav-group">
              <p className="admin-nav-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const badge =
                  item.badgeKey === "notifications" && unreadNotifications > 0
                    ? unreadNotifications
                    : 0;
                return (
                  <AdminLink
                    key={item.href}
                    href={item.href}
                    className={active ? "is-active" : undefined}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={16} aria-hidden />
                    <span>{item.label}</span>
                    {badge ? (
                      <em className="admin-nav-badge" aria-label={`${badge} unread`}>
                        {badge > 99 ? "99+" : badge}
                      </em>
                    ) : null}
                  </AdminLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-user">
          <div className="admin-user-avatar" aria-hidden>
            {initials(user.fullName)}
          </div>
          <div className="admin-user-meta">
            <strong>{user.fullName}</strong>
            <span>{user.roleName}</span>
          </div>
          <button
            type="button"
            className="admin-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-appbar">
          <div className="admin-appbar-row">
            <div className="admin-appbar-left">
              <button
                type="button"
                className="admin-menu-toggle"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="admin-sidebar"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <AdminLink href="/admin" className="admin-appbar-brand" title="Highbury Lounge">
                <AdminBrandLogo
                  className="admin-appbar-logo"
                  preferDark
                />
              </AdminLink>
              <div className="admin-appbar-title-block">
                <p className="admin-appbar-eyebrow">Highbury Lounge</p>
                <p className="admin-appbar-title">{title}</p>
              </div>
            </div>

            <div className="admin-appbar-right">
              <div className="admin-search-desktop">
                <AdminGlobalSearch variant="button" />
              </div>
              <AdminNotificationsBell />
              <div className="admin-profile" ref={profileRef}>
                <button
                  type="button"
                  className="admin-profile-trigger"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileOpen((open) => !open)}
                >
                  <span className="admin-user-avatar" aria-hidden>
                    {initials(user.fullName)}
                  </span>
                  <span className="admin-profile-name">{user.fullName}</span>
                </button>
                {profileOpen ? (
                  <div className="admin-profile-menu" role="menu">
                    <div className="admin-profile-meta">
                      <strong>{user.fullName}</strong>
                      <span>{user.email}</span>
                      <span>{user.roleName}</span>
                    </div>
                    <AdminLink
                      href="/admin/settings"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                    >
                      Settings
                    </AdminLink>
                    <form action="/api/admin/auth/logout" method="post">
                      <button type="submit" role="menuitem">
                        <LogOut size={14} aria-hidden /> Log out
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="admin-appbar-search-mobile">
            <AdminGlobalSearch variant="inline" />
          </div>
        </header>

        <main className="admin-main">
          {backHref ? (
            <BackLink
              className="back-link admin-back-link"
              href={backHref}
              label={backLabel}
              preferHistory={false}
            />
          ) : null}
          {children}
        </main>
      </div>
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          className: "admin-toast",
        }}
      />
    </div>
  );
}
