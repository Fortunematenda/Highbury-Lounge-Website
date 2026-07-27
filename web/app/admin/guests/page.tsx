import { desc, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bookingGuests } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { GuestsList } from "./guests-list";

export const dynamic = "force-dynamic";

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage(["booking_manager"]);
  const { q = "" } = await searchParams;
  const db = getDb();
  const pattern = `%${q}%`;
  const guests = await db
    .selectDistinct({
      email: bookingGuests.email,
      firstName: bookingGuests.firstName,
      lastName: bookingGuests.lastName,
      phone: bookingGuests.phone,
      country: bookingGuests.country,
    })
    .from(bookingGuests)
    .where(
      q
        ? or(
            like(bookingGuests.email, pattern),
            like(bookingGuests.firstName, pattern),
            like(bookingGuests.lastName, pattern),
            like(bookingGuests.phone, pattern),
          )
        : sql`1=1`,
    )
    .orderBy(desc(bookingGuests.id))
    .limit(100);

  return (
    <div className="admin-page">
      <h1>Guests</h1>
      <form className="admin-filters" method="get">
        <input className="admin-input" name="q" defaultValue={q} placeholder="Search guests" />
        <button className="admin-btn" type="submit">Search</button>
      </form>
      <section className="admin-card">
        <GuestsList guests={guests} />
      </section>
    </div>
  );
}
