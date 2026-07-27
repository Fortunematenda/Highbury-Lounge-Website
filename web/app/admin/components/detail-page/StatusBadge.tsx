import { statusColor } from "@/lib/format";

const FRIENDLY: Record<string, string> = {
  Pending: "Pending",
  "Awaiting Payment": "Awaiting payment",
  Confirmed: "Confirmed",
  "Checked In": "Checked in",
  "Checked Out": "Checked out",
  Cancelled: "Cancelled",
  Declined: "Declined",
  "No Show": "No show",
  Expired: "Expired",
  Active: "Active",
  Inactive: "Inactive",
  Featured: "Featured",
  Available: "Available",
  Unavailable: "Unavailable",
  Paid: "Paid",
  "Partially Paid": "Partially paid",
  Unpaid: "Unpaid",
  Refunded: "Refunded",
  Failed: "Failed",
  "New Enquiry": "New enquiry",
  Contacted: "Contacted",
  "Quotation Sent": "Quotation sent",
  "Awaiting Approval": "Awaiting approval",
  Approved: "Approved",
  Completed: "Completed",
};

export function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
}) {
  const label = FRIENDLY[status] ?? status.replaceAll("_", " ");
  const style =
    tone === "success"
      ? { background: "#15803d" }
      : tone === "warning"
        ? { background: "#b45309" }
        : tone === "danger"
          ? { background: "#9f1239" }
          : tone === "info"
            ? { background: "#1d4ed8" }
            : tone === "neutral"
              ? { background: "#64748b" }
              : { background: statusColor(status) };

  return (
    <span className="admin-badge detail-status-badge" style={style}>
      <span className="detail-status-dot" aria-hidden />
      {label}
    </span>
  );
}
