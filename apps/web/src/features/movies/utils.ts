import type { Video } from "@/lib/tmdb";

/** Picks the best trailer: YouTube, Trailer > Teaser, official, matching language first. */
export function pickTrailer(videos: Video[], lang: string): Video | undefined {
  const yt = videos.filter((v) => v.site === "YouTube");
  const score = (v: Video) =>
    (v.type === "Trailer" ? 4 : v.type === "Teaser" ? 2 : 0) +
    (v.official ? 1 : 0) +
    (v.iso_639_1 === lang ? 2 : 0);
  return yt.sort((a, b) => score(b) - score(a))[0];
}
