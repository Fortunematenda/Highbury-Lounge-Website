import type { ChannelManagerProvider } from "./provider";
import { createBeds24Provider } from "./providers/beds24/provider";

let beds24Singleton: ChannelManagerProvider | null = null;

/**
 * Resolve the active channel manager provider.
 * Today only Beds24 is implemented; factory stays open for SiteMinder etc.
 */
export function getChannelManager(
  provider: "beds24" = "beds24",
): ChannelManagerProvider {
  if (provider !== "beds24") {
    throw new Error(`Unknown channel manager provider: ${provider}`);
  }
  if (!beds24Singleton) {
    beds24Singleton = createBeds24Provider();
  }
  return beds24Singleton;
}
