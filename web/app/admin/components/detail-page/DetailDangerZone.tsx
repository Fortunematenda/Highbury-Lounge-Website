import type { ReactNode } from "react";
import { DetailActionButton } from "./DetailActionButton";
import type { DetailAction } from "./types";

export function DetailDangerZone({
  title = "Danger zone",
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: DetailAction;
  children?: ReactNode;
}) {
  return (
    <section className="admin-card detail-danger-zone">
      <div className="detail-section-head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
      {action ? (
        <DetailActionButton
          action={{ ...action, variant: action.variant ?? "danger" }}
        />
      ) : null}
    </section>
  );
}
