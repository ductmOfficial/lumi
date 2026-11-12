import type { MessageKey } from "@lumi/i18n";
import type { TFunction } from "@/i18n/useT";
import type { ExternalIds } from "@/lib/tmdb";

/** External links from TMDB external_ids. */
export function externalLinks(ids: ExternalIds | undefined, homepage?: string | null) {
  const links: { label: string; href: string }[] = [];
  if (homepage) links.push({ label: "Website", href: homepage });
  if (ids?.imdb_id)
    links.push({
      label: "IMDb",
      href: `https://www.imdb.com/${ids.imdb_id.startsWith("nm") ? "name" : "title"}/${ids.imdb_id}`,
    });
  if (ids?.instagram_id)
    links.push({ label: "Instagram", href: `https://www.instagram.com/${ids.instagram_id}` });
  if (ids?.facebook_id)
    links.push({ label: "Facebook", href: `https://www.facebook.com/${ids.facebook_id}` });
  if (ids?.twitter_id) links.push({ label: "X", href: `https://x.com/${ids.twitter_id}` });
  if (ids?.tiktok_id)
    links.push({ label: "TikTok", href: `https://www.tiktok.com/@${ids.tiktok_id}` });
  if (ids?.youtube_id)
    links.push({ label: "YouTube", href: `https://www.youtube.com/${ids.youtube_id}` });
  return links;
}

const STATUS: Record<string, MessageKey> = {
  Released: "status.released",
  "Post Production": "status.postProduction",
  "In Production": "status.inProduction",
  Planned: "status.planned",
  Rumored: "status.rumored",
  Canceled: "status.canceled",
  "Returning Series": "status.returning",
  Ended: "status.ended",
  Pilot: "status.pilot",
};

export const statusLabel = (status: string, t: TFunction) =>
  STATUS[status] ? t(STATUS[status]) : status;
