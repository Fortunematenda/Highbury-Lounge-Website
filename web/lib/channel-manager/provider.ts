import type {
  ChannelAvailabilityQuery,
  ChannelAvailabilityResult,
  ChannelBooking,
  ChannelBookingInput,
  ChannelBookingUpdate,
  ChannelConnectionTest,
  ChannelProperty,
  ChannelProviderKey,
  ChannelRateUpdate,
  ChannelRoom,
  ChannelWebhookResult,
} from "./types";

/**
 * Provider abstraction for OTA / channel managers.
 * Highbury talks only to this interface — never Beds24 specifics in UI/browser code.
 */
export interface ChannelManagerProvider {
  readonly key: ChannelProviderKey;

  testConnection(): Promise<ChannelConnectionTest>;

  getProperties(): Promise<ChannelProperty[]>;

  getRooms(propertyId: string): Promise<ChannelRoom[]>;

  getAvailability(
    query: ChannelAvailabilityQuery,
  ): Promise<ChannelAvailabilityResult[]>;

  getRates?(
    query: ChannelAvailabilityQuery,
  ): Promise<ChannelAvailabilityResult[]>;

  updateRates(updates: ChannelRateUpdate[]): Promise<void>;

  updateInventory(updates: ChannelRateUpdate[]): Promise<void>;

  createBooking(input: ChannelBookingInput): Promise<ChannelBooking>;

  getBooking(externalId: string): Promise<ChannelBooking | null>;

  updateBooking(update: ChannelBookingUpdate): Promise<ChannelBooking>;

  cancelBooking(externalId: string, reason?: string): Promise<ChannelBooking>;

  /**
   * Process an inbound webhook payload.
   * Must be idempotent for duplicate deliveries.
   */
  processWebhook(
    headers: Headers,
    body: string,
  ): Promise<ChannelWebhookResult>;
}
