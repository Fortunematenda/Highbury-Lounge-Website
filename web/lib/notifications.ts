import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { getSettingsMap } from "@/lib/settings";

export type NotificationContext = {
  guestName: string;
  reference: string;
  roomName?: string;
  eventDetails?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  total?: string;
  status?: string;
};

const TEMPLATES: Record<
  string,
  { subject: string; body: (ctx: NotificationContext, contact: ContactBlock) => string }
> = {
  booking_received: {
    subject: "Reservation received — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nThank you for choosing Highbury Lounge. We have received your reservation request ${ctx.reference}.\n\nRoom: ${ctx.roomName}\nDates: ${ctx.checkIn} to ${ctx.checkOut}\nGuests: ${ctx.guests}\nEstimated total: ${ctx.total}\nStatus: ${ctx.status} (awaiting confirmation)\n\nThis is not a payment confirmation. Our team will review availability and contact you shortly.\n\n${c.block}`,
  },
  booking_confirmed: {
    subject: "Booking confirmed — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nYour booking ${ctx.reference} is confirmed.\n\nRoom: ${ctx.roomName}\nDates: ${ctx.checkIn} to ${ctx.checkOut}\nGuests: ${ctx.guests}\nTotal: ${ctx.total}\nStatus: ${ctx.status}\n\n${c.block}`,
  },
  booking_declined: {
    subject: "Booking update — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nUnfortunately we are unable to confirm booking ${ctx.reference} for ${ctx.roomName} (${ctx.checkIn} to ${ctx.checkOut}).\n\nPlease contact us to discuss alternatives.\n\n${c.block}`,
  },
  awaiting_payment: {
    subject: "Awaiting payment — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nBooking ${ctx.reference} is awaiting payment.\n\nRoom: ${ctx.roomName}\nDates: ${ctx.checkIn} to ${ctx.checkOut}\nAmount due: ${ctx.total}\n\nPayment instructions will be provided by our reservations team.\n\n${c.block}`,
  },
  booking_changed: {
    subject: "Booking changed — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nYour booking ${ctx.reference} has been updated.\n\nRoom: ${ctx.roomName}\nDates: ${ctx.checkIn} to ${ctx.checkOut}\nGuests: ${ctx.guests}\nTotal: ${ctx.total}\nStatus: ${ctx.status}\n\n${c.block}`,
  },
  booking_cancelled: {
    subject: "Booking cancelled — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nBooking ${ctx.reference} has been cancelled.\n\n${c.block}`,
  },
  upcoming_stay_reminder: {
    subject: "Upcoming stay reminder — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nWe look forward to welcoming you soon.\n\nBooking: ${ctx.reference}\nRoom: ${ctx.roomName}\nCheck-in: ${ctx.checkIn}\n\n${c.block}`,
  },
  conference_enquiry_received: {
    subject: "Conference enquiry received — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nThank you for your conference enquiry ${ctx.reference}.\n\n${ctx.eventDetails ?? ""}\nStatus: ${ctx.status}\n\nOur events team will review your request and prepare a quotation.\n\n${c.block}`,
  },
  conference_quotation_sent: {
    subject: "Conference quotation — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nPlease find details for enquiry ${ctx.reference}.\n\n${ctx.eventDetails ?? ""}\nQuotation total: ${ctx.total}\n\n${c.block}`,
  },
  conference_booking_confirmed: {
    subject: "Conference booking confirmed — {{reference}}",
    body: (ctx, c) =>
      `Dear ${ctx.guestName},\n\nYour conference booking ${ctx.reference} is confirmed.\n\n${ctx.eventDetails ?? ""}\n\n${c.block}`,
  },
};

type ContactBlock = { block: string };

function fillSubject(template: string, ctx: NotificationContext) {
  return template.replace("{{reference}}", ctx.reference);
}

export async function queueNotification(params: {
  templateKey: string;
  recipientEmail: string;
  recipientName?: string;
  context: NotificationContext;
  relatedType?: string;
  relatedId?: number;
}) {
  const settings = await getSettingsMap();
  const contact: ContactBlock = {
    block: [
      settings.business_name || "Highbury Lounge",
      settings.address || "7504 Greenfield Cherries, Kadoma, Zimbabwe",
      `Phone: ${settings.phone || "+263 78 695 7068"}`,
      `Email: ${settings.email || "test@higbury.com"}`,
    ].join("\n"),
  };

  const template = TEMPLATES[params.templateKey];
  if (!template) {
    throw new Error(`Unknown notification template: ${params.templateKey}`);
  }

  const subject = fillSubject(template.subject, params.context);
  const bodyText = template.body(params.context, contact);

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );

  const db = getDb();
  let status: "queued" | "sent" | "failed" | "unconfigured" = "queued";
  let errorMessage: string | null = null;
  let sentAt: string | null = null;

  if (!smtpConfigured) {
    status = "unconfigured";
    errorMessage =
      "SMTP is not configured. Notification saved but not delivered.";
  } else {
    try {
      // Placeholder for future SMTP / provider integration
      status = "failed";
      errorMessage =
        "SMTP credentials present but no transport is wired yet. Notification saved.";
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "Send failed";
    }
  }

  const [row] = await db
    .insert(notifications)
    .values({
      templateKey: params.templateKey,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName ?? null,
      subject,
      bodyText,
      relatedType: params.relatedType ?? null,
      relatedId: params.relatedId ?? null,
      status,
      errorMessage,
      sentAt,
    })
    .returning();

  return row;
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}
