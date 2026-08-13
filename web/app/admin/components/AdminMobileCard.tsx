"use client";

import type { ReactNode, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AdminRowActions,
  type AdminRowAction,
} from "@/app/admin/components/AdminRowActions";

export function AdminMobileCard({
  title,
  subtitle,
  image,
  href,
  onOpen,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  image?: string | null;
  href?: string;
  onOpen?: () => void;
  actions?: AdminRowAction[];
  children?: ReactNode;
}) {
  const router = useRouter();
  const clickable = Boolean(href || onOpen);

  function activate(event: MouseEvent<HTMLElement>) {
    if (!clickable) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "[data-row-actions], a, button, input, select, textarea, label",
      )
    ) {
      return;
    }
    if (onOpen) {
      onOpen();
      return;
    }
    if (href) router.push(href);
  }

  return (
    <article
      className={`admin-mobile-card${clickable ? " is-clickable" : ""}${image ? " has-image" : ""}`}
      onClick={activate}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!clickable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(event as unknown as MouseEvent<HTMLElement>);
        }
      }}
    >
      {image ? (
        <div className="admin-mobile-card-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : null}
      <div className="admin-mobile-card-main">
        <div className="admin-mobile-card-top">
          <div className="admin-mobile-card-heading">
            <strong>{title}</strong>
            {subtitle ? (
              <div className="admin-mobile-card-sub">{subtitle}</div>
            ) : null}
          </div>
          {actions?.length ? (
            <AdminRowActions actions={actions} label={`Actions for ${String(title)}`} />
          ) : null}
        </div>
        {children ? <div className="admin-mobile-card-body">{children}</div> : null}
      </div>
    </article>
  );
}

export function AdminMobileMeta({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="admin-mobile-meta">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
