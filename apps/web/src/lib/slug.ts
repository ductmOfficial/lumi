import { slugify } from "@lumi/tmdb-client";

export { slugify };

/** "693134-dune-part-two" → 693134; returns NaN when invalid */
export function parseIdParam(param: string | undefined): number {
  const m = /^(\d+)/.exec(param ?? "");
  return m ? Number(m[1]) : Number.NaN;
}

/** Detail page link — picks /movie or /tv from media_type. */
export const movieHref = (m: { id: number; title?: string; media_type?: "movie" | "tv" }) => {
  const slug = m.title ? slugify(m.title) : "";
  return `/${m.media_type === "tv" ? "tv" : "movie"}/${m.id}${slug ? `-${slug}` : ""}`;
};
export const mediaHref = movieHref;

/** Unique key for a movie/series (movie and series ids can collide). */
export const mediaKey = (m: { id: number; media_type?: "movie" | "tv" }) =>
  `${m.media_type ?? "movie"}-${m.id}`;

export const personHref = (p: { id: number; name?: string }) => {
  const slug = p.name ? slugify(p.name) : "";
  return `/person/${p.id}${slug ? `-${slug}` : ""}`;
};

/** Browse page filtered by one TMDB keyword (clicking #keyword on a detail page) */
export const keywordHref = (keywordId: number, media: "movie" | "tv" = "movie") =>
  `/discover/browse?${media === "tv" ? "type=tv&" : ""}kw=${keywordId}`;
