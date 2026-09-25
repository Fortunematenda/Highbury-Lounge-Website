import Link from "next/link";
import { GitCompare } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { reconcileChannelBookings } from "@/lib/channel-manager";
import {
  DetailPageShell,
  DetailSectionCard,
} from "@/app/admin/components/detail-page";

export const dynamic = "force-dynamic";

export default async function Beds24ReconcilePage() {
  await requireAdminPage(["administrator", "booking_manager"]);
  const result = await reconcileChannelBookings();

  return (
    <DetailPageShell
      pageTitle="Reconciliation"
      breadcrumbs={[
        { label: "Beds24", href: "/admin/integrations/beds24" },
        { label: "Reconciliation" },
      ]}
      title="Booking reconciliation"
      description="Compare future Highbury bookings with Beds24 / Booking.com imports when sync is enabled."
      backAction={{
        label: "Back to Beds24",
        href: "/admin/integrations/beds24",
      }}
    >
      <DetailSectionCard title="Comparison" icon={GitCompare}>
        {!result.enabled ? (
          <div className="admin-warn" role="status">
            {result.message}
          </div>
        ) : (
          <p className="muted">{result.message}</p>
        )}
        <p className="muted" style={{ marginTop: 8 }}>
          Ambiguous matches are never auto-merged. Staff must review Possible
          Duplicate and Conflict rows.
        </p>
        <div className="admin-table-wrap" style={{ marginTop: 16 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Highbury</th>
                <th>External</th>
                <th>Dates</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No rows to compare yet.
                  </td>
                </tr>
              ) : (
                result.rows.map((row, idx) => (
                  <tr
                    key={`${row.state}-${row.highburyId || row.externalBookingId}-${idx}`}
                  >
                    <td>{row.state}</td>
                    <td>
                      {row.highburyId ? (
                        <Link href={`/admin/bookings/${row.highburyId}`}>
                          {row.highburyReference || `#${row.highburyId}`}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {row.externalBookingId || "—"}
                      {row.externalReference ? (
                        <>
                          <br />
                          <span className="muted">{row.externalReference}</span>
                        </>
                      ) : null}
                      {row.guestName ? (
                        <>
                          <br />
                          <span className="muted">{row.guestName}</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {row.checkIn || "—"} → {row.checkOut || "—"}
                    </td>
                    <td>{row.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DetailSectionCard>
    </DetailPageShell>
  );
}
