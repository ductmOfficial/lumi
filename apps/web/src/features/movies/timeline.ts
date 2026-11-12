import type {
  Episode,
  ImageItem,
  Keyword,
  MovieDetail,
  ReleaseDate,
  Review,
  SeasonSummary,
  Video,
} from "@/lib/tmdb";

/** A post on a title's timeline — every post comes from real TMDB data, nothing is made up. */
export type ImageType = "backdrops" | "posters" | "logos";

/** Maximum preview images per type in the photo-set post */
const PREVIEW_COUNT = 5;

export type MoviePost =
  | { id: string; kind: "overview"; date: string; image: string | null }
  | { id: string; kind: "tagline"; date: string; text: string }
  | { id: string; kind: "countdown"; date: string; days: number }
  // ---- series only ----
  /** upcoming episode (pinned) or the episode that just aired */
  | {
      id: string;
      kind: "episode";
      date: string;
      variant: "next" | "last";
      episode: Episode;
      days: number;
    }
  /** a season premiere (season 1 = series premiere) */
  | { id: string; kind: "season"; date: string; season: SeasonSummary; isFirst: boolean }
  /** series finale */
  | { id: string; kind: "ended"; date: string; seasons: number; episodes: number }
  | { id: string; kind: "release"; date: string; country: string; release: ReleaseDate }
  | { id: string; kind: "video"; date: string; video: Video }
  | { id: string; kind: "review"; date: string; review: Review }
  | {
      id: string;
      kind: "photos";
      date: string;
      /** preview images by type (≤ 5 each); the UI picks the layout from the counts */
      backdrops: ImageItem[];
      posters: ImageItem[];
      counts: Record<ImageType, number>;
      total: number;
    }
  /* photos, keywords, overview, tagline: no real timestamp — the UI shows no date */
  | { id: string; kind: "keywords"; date: string; keywords: Keyword[] };

const VIDEO_TYPES = new Set(["Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes"]);
const RELEASE_TYPES = new Set([1, 2, 3, 4]);
const DAY = 86_400_000;

interface Options {
  region: string;
  now: Date;
  maxVideos?: number;
  maxReviews?: number;
}

export function buildMovieTimeline(
  movie: MovieDetail,
  reviews: Review[],
  opts: Options,
): MoviePost[] {
  const posts: MoviePost[] = [];
  const release = movie.release_date;
  const today = opts.now.toISOString().slice(0, 10);

  // "Overview" post (pinned first): image + summary + rating
  if (movie.overview) {
    const image =
      movie.images.backdrops.find((b) => b.file_path !== movie.backdrop_path)?.file_path ??
      movie.backdrop_path;
    posts.push({ id: "overview", kind: "overview", date: today, image });
  }
  // Tagline becomes a colored-background post
  if (movie.tagline)
    posts.push({ id: "tagline", kind: "tagline", date: today, text: movie.tagline });

  // Release dates: the user's region + production country
  const origin = movie.origin_country?.[0] ?? movie.production_countries[0]?.iso_3166_1;
  const countries = [...new Set([opts.region, origin].filter(Boolean) as string[])];
  for (const c of countries) {
    const entry = movie.release_dates.results.find((r) => r.iso_3166_1 === c);
    if (!entry) continue;
    const seenTypes = new Set<number>();
    for (const r of [...entry.release_dates].sort((a, b) =>
      a.release_date.localeCompare(b.release_date),
    )) {
      if (!RELEASE_TYPES.has(r.type)) continue;
      // merge 2 (limited) & 3 (wide) into one post
      const typeKey = r.type === 2 ? 3 : r.type;
      if (seenTypes.has(typeKey)) continue;
      seenTypes.add(typeKey);
      posts.push({
        id: `release-${c}-${r.type}`,
        kind: "release",
        date: r.release_date,
        country: c,
        release: r,
      });
    }
  }

  // Pinned post: countdown to the release date
  const regional = posts.find(
    (p) =>
      p.kind === "release" &&
      p.country === opts.region &&
      p.release.type >= 2 &&
      p.release.type <= 3,
  );
  const premiere = regional?.date ?? release;
  if (premiere) {
    const days = Math.ceil((new Date(premiere).getTime() - opts.now.getTime()) / DAY);
    // a series with a "next episode" needs no premiere countdown
    if (days > 0 && !movie.tv?.next_episode_to_air)
      posts.push({ id: "countdown", kind: "countdown", date: premiere, days });
  }

  // Series: next episode (pinned), latest episode, season premieres, finale
  const tv = movie.tv;
  if (tv) {
    const days = (d: string) => Math.ceil((new Date(d).getTime() - opts.now.getTime()) / DAY);
    const next = tv.next_episode_to_air;
    if (next?.air_date)
      posts.push({
        id: "episode-next",
        kind: "episode",
        variant: "next",
        date: next.air_date,
        episode: next,
        days: Math.max(0, days(next.air_date)),
      });
    const last = tv.last_episode_to_air;
    if (last?.air_date && last.air_date <= today)
      posts.push({
        id: "episode-last",
        kind: "episode",
        variant: "last",
        date: last.air_date,
        episode: last,
        days: 0,
      });
    const regular = tv.seasons.flatMap((se) =>
      se.season_number > 0 && se.air_date && se.air_date <= today
        ? [{ ...se, air_date: se.air_date }]
        : [],
    );
    regular.forEach((season, i) =>
      posts.push({
        id: `season-${season.season_number}`,
        kind: "season",
        date: season.air_date,
        season,
        isFirst: i === 0,
      }),
    );
    if ((tv.status === "Ended" || tv.status === "Canceled") && tv.last_air_date) {
      posts.push({
        id: "ended",
        kind: "ended",
        date: tv.last_air_date,
        seasons: tv.number_of_seasons,
        episodes: tv.number_of_episodes,
      });
    }
  }

  // Video
  movie.videos.results
    .filter((v) => v.site === "YouTube" && VIDEO_TYPES.has(v.type) && v.published_at)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, opts.maxVideos ?? 6)
    .forEach((v) =>
      posts.push({ id: `video-${v.id}`, kind: "video", date: v.published_at, video: v }),
    );

  // Review
  reviews
    .slice(0, opts.maxReviews ?? 3)
    .forEach((r) =>
      posts.push({ id: `review-${r.id}`, kind: "review", date: r.created_at, review: r }),
    );

  // Photo set (one post merging backdrops / posters / logos) & keywords have no date of their own → anchor them to the release date
  // (or today if the title is not out yet) so nothing is "posted in the future".
  // The collection is NO LONGER a post — it is highlighted in the header + About column.
  if (release) {
    const anchor = release < today ? release : today;
    // A single photo-set post merging every image type
    const { backdrops, posters, logos } = movie.images;
    const counts = { backdrops: backdrops.length, posters: posters.length, logos: logos.length };
    if (backdrops.length + posters.length >= 2) {
      posts.push({
        id: "photos",
        kind: "photos",
        date: anchor,
        backdrops: backdrops.slice(0, PREVIEW_COUNT),
        posters: posters.slice(0, PREVIEW_COUNT),
        counts,
        total: counts.backdrops + counts.posters + counts.logos,
      });
    }
    if (movie.keywords.keywords.length) {
      posts.push({
        id: "keywords",
        kind: "keywords",
        date: anchor,
        keywords: movie.keywords.keywords.slice(0, 12),
      });
    }
  }

  // Pinned posts always come first in a fixed order; the rest newest first
  const pinned: Partial<Record<MoviePost["kind"], number>> = {
    overview: 0,
    countdown: 1,
    tagline: 2,
  };
  const isPinned = (p: MoviePost) =>
    p.kind === "episode" && p.variant === "next" ? 1.5 : pinned[p.kind];
  const order: Record<MoviePost["kind"], number> = {
    overview: 0,
    countdown: 1,
    tagline: 2,
    ended: 3,
    episode: 3,
    season: 3,
    release: 3,
    video: 4,
    review: 5,
    photos: 6,
    keywords: 7,
  };
  return posts.sort((a, b) => {
    const pa = isPinned(a);
    const pb = isPinned(b);
    if (pa !== undefined || pb !== undefined) return (pa ?? 99) - (pb ?? 99);
    return b.date.localeCompare(a.date) || order[a.kind] - order[b.kind];
  });
}

/** Reviewer avatar: TMDB sometimes returns absolute URLs like "/https://..." */
export function reviewerAvatar(path: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/http")) return path.slice(1);
  return `https://image.tmdb.org/t/p/w92${path}`;
}
