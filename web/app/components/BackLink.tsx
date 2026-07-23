"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useTranslation } from "@/lib/i18n/I18nProvider";

type Props = {
  href?: string;
  label?: string;
  /** Prefer browser history when possible */
  preferHistory?: boolean;
};

export function BackLink({
  href = "/",
  label,
  preferHistory = true,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("actions.back");

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
      {resolvedLabel}
    </Link>
  );
}
