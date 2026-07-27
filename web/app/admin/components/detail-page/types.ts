import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type DetailBreadcrumb = {
  label: string;
  href?: string;
};

export type DetailAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
};

export type DetailShellProps = {
  breadcrumbs?: DetailBreadcrumb[];
  title: string;
  description?: string;
  status?: ReactNode;
  backAction?: DetailAction;
  primaryAction?: DetailAction;
  secondaryActions?: DetailAction[];
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional document / topbar title override */
  pageTitle?: string;
};
