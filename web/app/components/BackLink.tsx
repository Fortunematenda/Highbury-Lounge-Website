"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

type Props = {
  href?: string;
  label?: string;
  /** Prefer browser history when possible */
  preferHistory?: boolean;
};

export function BackLink({
  href = "/",
  label = "Back",
  preferHistory = true,
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
    <Link className="back-link" href={href} onClick={onClick}>
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
