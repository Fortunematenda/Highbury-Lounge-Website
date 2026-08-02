import { getDb } from "@/db";
import { adminNotifications } from "@/db/schema";

export type AdminNotificationType =
  | "booking_received"
  | "booking_cancelled"
  | "booking_payment"
  | "booking_status"
  | "booking_confirmation_needed"
  | "check_in_upcoming"
  | "check_out_upcoming"
  | "conference_request"
  | "food_preorder"
  | "event_reservation"
  | "contact_enquiry"
  | "room_availability"
  | "menu_unavailable"
  | "general";

export async function createAdminNotification(params: {
  type: AdminNotificationType | string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: number | null;
  actionUrl?: string | null;
  adminUserId?: number | null;
}) {
  try {
    const db = getDb();
    const [row] = await db
      .insert(adminNotifications)
      .values({
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        actionUrl: params.actionUrl ?? null,
        adminUserId: params.adminUserId ?? null,
        isRead: false,
      })
      .returning();
    return row;
  } catch (error) {
    console.error("createAdminNotification failed", error);
    return null;
  }
}
