import { ArrowLeft } from "lucide-react";
import { DetailPageBreadcrumbs } from "./DetailPageBreadcrumbs";
import { DetailActionButton } from "./DetailActionButton";
import type { DetailAction, DetailBreadcrumb } from "./types";
import type { ReactNode } from "react";

export function DetailPageHeader({
  breadcrumbs,
  title,
  description,
  status,
  backAction,
  primaryAction,
  secondaryActions = [],
}: {
  breadcrumbs?: DetailBreadcrumb[];
  title: string;
  description?: string;
  status?: ReactNode;
  backAction?: DetailAction;
  primaryAction?: DetailAction;
  secondaryActions?: DetailAction[];
}) {
  const back = backAction
    ? {
        ...backAction,
        icon: backAction.icon ?? ArrowLeft,
        variant: backAction.variant ?? "ghost",
      }
    : undefined;

  return (
    <header className="detail-page-header">
      {breadcrumbs?.length ? <DetailPageBreadcrumbs items={breadcrumbs} /> : null}
      <div className="detail-page-header-row">
        <div className="detail-page-header-copy">
          <div className="detail-page-title-row">
            <h1>{title}</h1>
            {status}
          </div>
          {description ? <p className="page-sub">{description}</p> : null}
        </div>
        <div className="detail-page-header-actions">
          {back ? <DetailActionButton action={back} /> : null}
          {secondaryActions.map((action) => (
            <DetailActionButton key={action.label} action={action} />
          ))}
          {primaryAction ? (
            <DetailActionButton
              action={{ ...primaryAction, variant: primaryAction.variant ?? "primary" }}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
