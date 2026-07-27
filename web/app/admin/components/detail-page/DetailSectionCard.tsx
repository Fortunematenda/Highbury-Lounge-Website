import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function DetailSectionCard({
  title,
  description,
  icon: Icon,
  headerAction,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-card detail-section-card ${className}`.trim()}>
      <div className="detail-section-head">
        <div>
          <h2>
            {Icon ? <Icon size={18} aria-hidden /> : null}
            {title}
          </h2>
          {description ? <p>{description}</p> : null}
        </div>
        {headerAction}
      </div>
      <div className="detail-section-body">{children}</div>
    </section>
  );
}
