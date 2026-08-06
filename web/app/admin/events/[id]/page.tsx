import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { eventReservations, events } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin-page";
import { formatAuditActorLabel, getLatestEntityChange } from "@/lib/audit";
import { countReservedGuests } from "@/lib/events";
import { EventForm, type EventRecord } from "../event-form";

export const dynamic = "force-dynamic";

function parseStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function parseProgramme(
  json: string | null | undefined,
): Array<{ time: string; title: string; detail?: string }> {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: Array<{ time: string; title: string; detail?: string }> = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const time = String(row.time ?? "").trim();
      const title = String(row.title ?? "").trim();
      if (!time || !title) continue;
      items.push({ time, title, detail: row.detail ? String(row.detail) : undefined });
    }
    return items;
  } catch {
    return [];
  }
}

function isNextRouterError(err: unknown): boolean {
  return typeof (err as { digest?: string })?.digest === "string";
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage(["content_manager"]);
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId)) notFound();

  let event;
  let reservedGuests: number = 0;
  let reservationRow: { count: number } | undefined;
  let reservations: {
    id: number;
    reference: string;
    fullName: string;
    email: string;
    phone: string;
    guestCount: number;
    status: string;
    createdAt: string;
  }[] = [];
  let lastChange: Awaited<ReturnType<typeof getLatestEntityChange>> = null;
  try {
    const db = getDb();
    [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
      .limit(1);
    if (!event) notFound();

    reservedGuests = await countReservedGuests(eventId);
    [reservationRow] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(eventReservations)
      .where(eq(eventReservations.eventId, eventId));

    reservations = await db
      .select({
        id: eventReservations.id,
        reference: eventReservations.reference,
        fullName: eventReservations.fullName,
        email: eventReservations.email,
        phone: eventReservations.phone,
        guestCount: eventReservations.guestCount,
        status: eventReservations.status,
        createdAt: eventReservations.createdAt,
      })
      .from(eventReservations)
      .where(eq(eventReservations.eventId, eventId))
      .orderBy(desc(eventReservations.createdAt));

    lastChange = await getLatestEntityChange("event", eventId);
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error("[admin/events/[id]] Failed to load event:", err);
    notFound();
  }

  const record: EventRecord = {
    id: event.id,
    title: event.title,
    slug: event.slug,
    shortDescription: event.shortDescription,
    description: event.description,
    category: event.category,
    tags: parseStringArray(event.tagsJson),
    artistOrHost: event.artistOrHost,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone,
    coverImage: event.coverImage,
    posterImage: event.posterImage,
    gallery: parseStringArray(event.galleryJson),
    entryType: event.entryType,
    currency: event.currency,
    price: event.price,
    capacity: event.capacity,
    trackCapacity: event.trackCapacity,
    soldOutOverride: event.soldOutOverride,
    limitedSpaceThreshold: event.limitedSpaceThreshold,
    actionType: event.actionType,
    customActionLabel: event.customActionLabel,
    externalBookingUrl: event.externalBookingUrl,
    enableOnlineReservations: event.enableOnlineReservations,
    minGuests: event.minGuests,
    maxGuestsPerReservation: event.maxGuestsPerReservation,
    reservationDeadline: event.reservationDeadline,
    requireApproval: event.requireApproval,
    programme: parseProgramme(event.programmeJson),
    dressCode: event.dressCode,
    ageNote: event.ageNote,
    attendanceInfo: event.attendanceInfo,
    status: event.status,
    isFeatured: event.isFeatured,
    showAnnouncement: event.showAnnouncement,
    publishedAt: event.publishedAt,
    seoTitle: event.seoTitle,
    seoDescription: event.seoDescription,
    socialImage: event.socialImage,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };

  return (
    <EventForm
      mode="edit"
      initial={record}
      reservedGuests={reservedGuests}
      reservationCount={Number(reservationRow?.count ?? 0)}
      reservations={reservations}
      lastChange={
        lastChange
          ? {
              label: formatAuditActorLabel(lastChange.actor),
              email: lastChange.actor?.email ?? null,
              at: lastChange.createdAt,
            }
          : null
      }
    />
  );
}
