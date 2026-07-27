import type { ReactNode } from "react";

export function DetailFieldGrid({
  columns = 2,
  children,
  className = "",
}: {
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`detail-field-grid cols-${columns} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function DetailFieldSpan({
  span = 2,
  children,
}: {
  span?: 2 | 3;
  children: ReactNode;
}) {
  return <div className={`detail-field-span-${span}`}>{children}</div>;
}
