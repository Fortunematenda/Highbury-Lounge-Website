import { INTL_LOCALE, type AppLocale } from "./i18n/locales";

export function formatMoney(
  amount: number,
  currency = "USD",
  locale: AppLocale | string = "en",
) {
  const intlLocale = INTL_LOCALE[locale as AppLocale] ?? "en-US";
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(isoDate: string, locale: AppLocale | string = "en") {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T12:00:00`);
  const intlLocale = INTL_LOCALE[locale as AppLocale] ?? "en-GB";
  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: locale === "zh-CN" ? "long" : "short",
    year: "numeric",
  }).format(d);
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    Pending: "#b45309",
    "Awaiting Payment": "#a16207",
    Confirmed: "#15803d",
    "Checked In": "#1d4ed8",
    "Checked Out": "#475569",
    Cancelled: "#64748b",
    Declined: "#b91c1c",
    "No Show": "#7c2d12",
    Expired: "#6b7280",
    "New Enquiry": "#b45309",
    Contacted: "#0369a1",
    "Quotation Sent": "#7c3aed",
    "Awaiting Approval": "#a16207",
    Approved: "#15803d",
    Completed: "#475569",
    Unpaid: "#b91c1c",
    "Partially Paid": "#a16207",
    Paid: "#15803d",
    Refunded: "#64748b",
    Failed: "#b91c1c",
  };
  return map[status] ?? "#70163f";
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
