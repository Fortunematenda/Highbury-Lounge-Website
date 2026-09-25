export { getChannelManager } from "./factory";
export { isBeds24Enabled } from "./providers/beds24/config";
export {
  getBeds24Config,
  hasBeds24Credentials,
  BOOKING_COM_ACCOMMODATION_NUMBER,
  BEDS24_PROVIDER,
} from "./providers/beds24/config";
export {
  bookingSourceLabel,
  syncStatusLabel,
  normalizeBookingSource,
} from "./booking-sources";
export {
  searchAccommodationAvailability,
  revalidateRoomAvailability,
} from "./availability-service";
export {
  syncBookingOutboundIfEnabled,
  cancelBookingOutboundIfEnabled,
  upsertInboundChannelBooking,
} from "./booking-sync";
export { writeChannelSyncLog, listChannelSyncLogs, getLatestEntitySync } from "./sync-log";
export { reconcileChannelBookings } from "./reconcile";
export { syncRoomListPriceToChannel } from "./rate-sync";
export {
  listRoomChannelStatuses,
  retryRoomRateSync,
} from "./room-sync-status";
export type { ChannelManagerProvider } from "./provider";
export type * from "./types";

import { isBeds24Enabled } from "./providers/beds24/config";

export function isChannelManagerLive(): boolean {
  return isBeds24Enabled();
}
