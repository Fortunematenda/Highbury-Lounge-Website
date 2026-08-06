"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

type Props = {
  href?: string;
  label?: string;
  /** Prefer browser history when possible */
  preferHistory?: boolean;
  className?: string;
};

export function BackLink({
  href = "/",
  label = "Back",
  preferHistory = true,
  className = "back-link",
}: Props) {
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!preferHistory) return;
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link className={className} href={href} onClick={onClick} prefetch={false}>
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}

/** Resolve a sensible parent path for admin nested routes. */
export function adminBackHref(pathname: string | null | undefined): string | null {
  if (!pathname || pathname === "/admin/login" || pathname === "/admin") {
    return null;
  }

  // Detail pages use DetailPageShell back actions instead of the generic link.
  if (
    /^\/admin\/(rooms|bookings|conference|packages)\/[^/]+$/.test(pathname) ||
    pathname === "/admin/rooms/new" ||
    pathname === "/admin/packages/new" ||
    pathname === "/admin/blocks/new" ||
    pathname === "/admin/payments/new" ||
    pathname === "/admin/menus/items/new" ||
    /^\/admin\/menus\/items\/[^/]+$/.test(pathname)
  ) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  // /admin/rooms -> /admin
  // /admin/rooms/12 -> /admin/rooms
  // /admin/rooms/new -> /admin/rooms
  if (segments[0] !== "admin") return "/admin";
  if (segments.length === 2) return "/admin";
  if (segments.length >= 3) {
    return `/${segments.slice(0, 2).join("/")}`;
  }
  return "/admin";
}

export function adminBackLabel(pathname: string | null | undefined): string {
  return "Back";
}
