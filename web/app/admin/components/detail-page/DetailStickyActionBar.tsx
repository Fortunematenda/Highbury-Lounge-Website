"use client";

import { DetailActionButton } from "./DetailActionButton";
import type { DetailAction } from "./types";

export function DetailStickyActionBar({
  message,
  visible,
  primaryAction,
  cancelAction,
  tone = "dark",
}: {
  message?: string;
  visible: boolean;
  primaryAction?: DetailAction | null;
  cancelAction?: DetailAction;
  /** "light" removes the dark pill background (wizard / next-back bars). */
  tone?: "dark" | "light";
}) {
  if (!visible) return null;
  if (!primaryAction && !cancelAction) return null;
  return (
    <div
      className={[
        "detail-sticky-bar",
        message ? "" : "is-actions-only",
        tone === "light" ? "is-light" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      {message ? <p>{message}</p> : null}
      <div className="detail-sticky-bar-actions">
        {cancelAction ? <DetailActionButton action={cancelAction} /> : null}
        {primaryAction ? (
          <DetailActionButton
            action={{
              ...primaryAction,
              variant: primaryAction.variant ?? "primary",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
