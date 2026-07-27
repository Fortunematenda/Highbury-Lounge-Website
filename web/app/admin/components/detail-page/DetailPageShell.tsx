"use client";

import { useEffect } from "react";
import { DetailPageHeader } from "./DetailPageHeader";
import type { DetailShellProps } from "./types";

export function DetailPageShell({
  breadcrumbs,
  title,
  description,
  status,
  backAction,
  primaryAction,
  secondaryActions,
  sidebar,
  children,
  className = "",
  pageTitle,
}: DetailShellProps) {
  useEffect(() => {
    const next = pageTitle || title;
    if (!next) return;
    document.title = `${next} | Highbury Lounge Admin`;
    window.dispatchEvent(
      new CustomEvent("admin:page-title", { detail: { title: next } }),
    );
  }, [pageTitle, title]);

  return (
    <div className={`detail-page-shell ${className}`.trim()}>
      <DetailPageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        description={description}
        status={status}
        backAction={backAction}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
      />
      <div className={`detail-page-grid${sidebar ? "" : " is-single"}`}>
        <div className="detail-page-main">{children}</div>
        {sidebar ? <aside className="detail-page-sidebar">{sidebar}</aside> : null}
      </div>
    </div>
  );
}
