"use client";

import { DetailActionButton } from "./DetailActionButton";
import type { DetailAction } from "./types";

export function DetailStickyActionBar({
  message,
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
    <div
      className={`detail-sticky-bar${message ? "" : " is-actions-only"}`}
      role="status"
    >
      {message ? <p>{message}</p> : null}
      <div className="detail-sticky-bar-actions">
        {cancelAction ? <DetailActionButton action={cancelAction} /> : null}
        <DetailActionButton
          action={{
            ...primaryAction,
            variant: primaryAction.variant ?? "primary",
          }}
        />
      </div>
    </div>
  );
}
