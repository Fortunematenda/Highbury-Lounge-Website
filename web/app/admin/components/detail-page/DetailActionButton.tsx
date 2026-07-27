"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { DetailAction } from "./types";

export function DetailActionButton({
  action,
  className = "",
}: {
  action: DetailAction;
  className?: string;
}) {
  const Icon = action.icon;
  const variant = action.variant ?? "secondary";
  const classes = [
    "admin-btn",
    variant === "primary" ? "" : variant === "danger" ? "danger" : variant,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {action.loading ? (
        <Loader2 size={16} className="spin" aria-hidden />
      ) : Icon ? (
        <Icon size={16} aria-hidden />
      ) : null}
      {action.label}
    </>
  );

  if (action.href && !action.onClick && action.type !== "submit") {
    return (
      <Link
        href={action.href}
        className={classes}
        aria-disabled={action.disabled || action.loading}
        onClick={(event) => {
          if (action.disabled || action.loading) event.preventDefault();
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={action.type ?? "button"}
      className={classes}
      disabled={action.disabled || action.loading}
      onClick={action.onClick}
    >
      {content}
    </button>
  );
}
