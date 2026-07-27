"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PmsPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="pms-page-header">
      <div className="pms-page-header-copy">
        {eyebrow ? <p className="pms-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="pms-page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="pms-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function PmsEmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string; icon?: LucideIcon };
  icon?: LucideIcon;
}) {
  const ActionIcon = action?.icon;
  return (
    <div className="pms-empty">
      {Icon ? (
        <div className="pms-empty-icon" aria-hidden>
          <Icon size={28} />
        </div>
      ) : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? (
        <Link className="admin-btn" href={action.href}>
          {ActionIcon ? <ActionIcon size={16} aria-hidden /> : null}
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function PmsFab({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link className="pms-fab" href={href} aria-label={label}>
      <Icon size={22} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

export function PmsMetaRow({
  items,
}: {
  items: Array<{ icon: LucideIcon; label: string; value: ReactNode }>;
}) {
  return (
    <ul className="pms-meta-row">
      {items.map((item) => (
        <li key={item.label}>
          <item.icon size={14} aria-hidden />
          <span className="pms-meta-label">{item.label}</span>
          <strong>{item.value}</strong>
        </li>
      ))}
    </ul>
  );
}

export function PmsQuickActions({
  items,
}: {
  items: Array<{ label: string; href: string; icon: LucideIcon }>;
}) {
  return (
    <div className="pms-quick-actions">
      {items.map((item) => (
        <Link key={item.href} className="pms-quick-action" href={item.href}>
          <item.icon size={16} aria-hidden />
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function PmsTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; icon?: LucideIcon }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="pms-tabs" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`pms-tab${active ? " is-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon ? <tab.icon size={15} aria-hidden /> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function PmsStatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  return <span className={`pms-pill pms-pill-${tone}`}>{label}</span>;
}
