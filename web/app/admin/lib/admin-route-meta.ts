export type AdminRouteMeta = {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
};

/** Resolve app-bar / document title from pathname. */
export function resolveAdminRouteMeta(pathname: string): AdminRouteMeta {
  if (!pathname || pathname === "/admin") {
    return { title: "Dashboard" };
  }

  const segments = pathname.split("/").filter(Boolean);
  // ["admin", ...]
  const rest = segments.slice(1);
  if (rest.length === 0) return { title: "Dashboard" };

  const root = rest[0];
  const leaf = rest[rest.length - 1];

  const modules: Record<string, string> = {
    bookings: "Bookings",
    calendar: "Calendar",
    rooms: "Rooms",
    blocks: "Blocks",
    conference: "Conference Requests",
    packages: "Packages",
    payments: "Payments",
    menus: "Menus & Products",
    pricing: "Pricing",
    gallery: "Gallery",
    guests: "Guests",
    notifications: "Notifications",
    reports: "Reports",
    users: "Users",
    audit: "Audit",
    settings: "Settings",
  };

  const moduleLabel = modules[root] ?? "Admin";

  if (rest.length === 1) {
    return { title: moduleLabel };
  }

  if (root === "rooms" && leaf === "new") {
    return {
      title: "Add room",
      breadcrumbs: [
        { label: "Rooms", href: "/admin/rooms" },
        { label: "Add room" },
      ],
    };
  }

  if (root === "rooms" && rest.length >= 2) {
    return {
      title: "Edit room",
      breadcrumbs: [
        { label: "Rooms", href: "/admin/rooms" },
        { label: "Edit room" },
      ],
    };
  }

  if (root === "bookings" && rest.length >= 2) {
    return {
      title: "Booking details",
      breadcrumbs: [
        { label: "Bookings", href: "/admin/bookings" },
        { label: "Booking details" },
      ],
    };
  }

  if (root === "conference" && rest.length >= 2) {
    return {
      title: "Conference request",
      breadcrumbs: [
        { label: "Conference Requests", href: "/admin/conference" },
        { label: "Request details" },
      ],
    };
  }

  return { title: moduleLabel };
}
