import Link from "next/link";
import { Loader2 } from "lucide-react";

export function DetailLoadingSkeleton() {
  return (
    <div className="detail-page-shell" aria-busy="true" aria-live="polite">
      <div className="detail-skeleton detail-skeleton-header" />
      <div className="detail-page-grid">
        <div className="detail-page-main">
          <div className="detail-skeleton detail-skeleton-card" />
          <div className="detail-skeleton detail-skeleton-card" />
        </div>
        <div className="detail-skeleton detail-skeleton-side" />
      </div>
      <p className="admin-inline-loading">
        <Loader2 size={14} className="spin" aria-hidden /> Loading…
      </p>
    </div>
  );
}

export function DetailErrorState({
  title = "Something went wrong",
  message = "We could not load this record. Please try again.",
  onRetry,
  backHref,
  backLabel = "Go back",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="admin-card detail-state-card" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="admin-actions">
        {onRetry ? (
          <button type="button" className="admin-btn" onClick={onRetry}>
            Try again
          </button>
        ) : null}
        {backHref ? (
          <Link className="admin-btn secondary" href={backHref}>
            {backLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function DetailEmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="admin-card detail-state-card">
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
      {actionHref && actionLabel ? (
        <Link className="admin-btn" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function DetailNotFoundState({
  title = "Record not found",
  message = "This record may have been removed or the link is incorrect.",
  backHref,
  backLabel = "Back",
}: {
  title?: string;
  message?: string;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <DetailErrorState
      title={title}
      message={message}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
