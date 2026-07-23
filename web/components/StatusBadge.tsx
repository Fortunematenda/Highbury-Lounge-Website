import { statusColor } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="admin-badge" style={{ background: statusColor(status) }}>
      {status}
    </span>
  );
}
