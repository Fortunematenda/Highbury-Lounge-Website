import type { ReactNode } from "react";

export function DetailMetadataCard({
  title = "Record details",
  items,
}: {
  title?: string;
  items: Array<{ label: string; value: ReactNode }>;
}) {
  const visible = items.filter((item) => item.value != null && item.value !== "");
  if (!visible.length) return null;
  return (
    <section className="admin-card detail-section-card">
      <div className="detail-section-head">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <dl className="detail-meta-list">
        {visible.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
