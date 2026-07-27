"use client";

import { DetailActionButton } from "./DetailActionButton";
import type { DetailAction } from "./types";

export function DetailStickyActionBar({
  message = "You have unsaved changes",
  visible,
  primaryAction,
  cancelAction,
}: {
  message?: string;
  visible: boolean;
  primaryAction: DetailAction;
  cancelAction?: DetailAction;
}) {
  if (!visible) return null;
  return (
    <div className="detail-sticky-bar" role="status">
      <p>{message}</p>
      <div className="detail-sticky-bar-actions">
        {cancelAction ? <DetailActionButton action={cancelAction} /> : null}
        <DetailActionButton
          action={{ ...primaryAction, variant: primaryAction.variant ?? "primary" }}
        />
      </div>
    </div>
  );
}
