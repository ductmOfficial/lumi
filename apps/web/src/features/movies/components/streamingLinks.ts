import type { WatchProvider, WatchProvidersByRegion } from "@/lib/tmdb";
import type { StreamingService } from "@/stores/preferences";

/** Tiers you can watch without buying or renting the title. */
const STREAMING_TIERS = ["flatrate", "ads", "free"] as const;

/**
 * Search pages of services that open a title on their site or app, keyed by TMDB provider_id.
 * TMDB does not return the services' own title ids, so the link searches for the title.
 */
const SEARCH_PAGES: Record<number, string> = {
  8: "https://www.netflix.com/search?q=",
  9: "https://www.primevideo.com/search?phrase=",
  119: "https://www.primevideo.com/search?phrase=",
  350: "https://tv.apple.com/search?term=",
};

/** A service also lists variants ("… Kids", "… with Ads") under other ids with the same name prefix. */
function isService(provider: WatchProvider, service: StreamingService): boolean {
  return (
    provider.provider_id === service.id ||
    provider.provider_name.toLowerCase().startsWith(service.name.toLowerCase())
  );
}

/** Is the title on the service (subscription, with ads or free) in the selected region? */
export function isOnService(
  data: WatchProvidersByRegion | undefined,
  service: StreamingService | null,
): boolean {
  if (!data || !service) return false;
  return STREAMING_TIERS.some((tier) => data[tier]?.some((p) => isService(p, service)));
}

/** Link that opens the title on the service, when the service has a known search page. */
export function serviceSearchUrl(service: StreamingService, title: string): string | undefined {
  const page = SEARCH_PAGES[service.id];
  return page && page + encodeURIComponent(title.trim());
}
