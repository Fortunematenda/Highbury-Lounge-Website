import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channelSyncLogs } from "@/db/schema";
import type {
  ChannelProviderKey,
  SyncLogDirection,
  SyncLogStatus,
} from "./types";

export type WriteSyncLogInput = {
  provider: ChannelProviderKey | string;
  entityType: string;
  entityId?: string | number | null;
  externalReference?: string | null;
  direction: SyncLogDirection;
  eventType: string;
  status: SyncLogStatus;
  message?: string | null;
  error?: string | null;
};

/** Persist a channel sync log entry (never store tokens or payment secrets). */
export async function writeChannelSyncLog(input: WriteSyncLogInput) {
  const db = getDb();
  const [row] = await db
    .insert(channelSyncLogs)
    .values({
      provider: input.provider,
      entityType: input.entityType,
      entityId:
        input.entityId === undefined || input.entityId === null
          ? null
          : String(input.entityId),
      externalReference: input.externalReference ?? null,
      direction: input.direction,
      eventType: input.eventType,
      status: input.status,
      message: input.message ?? null,
      error: input.error ?? null,
    })
    .returning();
  return row;
}

export async function listChannelSyncLogs(options?: {
  provider?: string;
  limit?: number;
}) {
  const db = getDb();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  if (options?.provider) {
    return db
      .select()
      .from(channelSyncLogs)
      .where(eq(channelSyncLogs.provider, options.provider))
      .orderBy(desc(channelSyncLogs.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(channelSyncLogs)
    .orderBy(desc(channelSyncLogs.createdAt))
    .limit(limit);
}

export async function getLatestSyncEvent(options: {
  provider: string;
  eventType?: string;
  status?: SyncLogStatus;
}) {
  const rows = await listChannelSyncLogs({
    provider: options.provider,
    limit: 100,
  });
  return (
    rows.find((r) => {
      if (options.eventType && r.eventType !== options.eventType) return false;
      if (options.status && r.status !== options.status) return false;
      return true;
    }) ?? null
  );
}
