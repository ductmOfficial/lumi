/**
 * RULE-based personalization engine — no ML/AI,
 * in line with the TMDB API Terms (section 1.C forbids using TMDB data in ML/AI applications).
 * Everything is a pure function so it is easy to test.
 */
import type { StreamingService } from "@/stores/preferences";
import type { MovieCategory } from "@/features/movies/api/queries";
import { mediaKey } from "@/lib/slug";
import type { MovieLite, Reaction, SignalEvent, SignalType } from "./types";

export const SIGNAL_WEIGHT: Record<SignalType, number> = {
  onboard: 5,
  watchlist: 4,
  like: 4,
  trailer: 2,
  view: 1,
  dislike: -4,
};
export const HALF_LIFE_DAYS = 30;
const DAY = 86_400_000;

export const GENRE = {
  action: 28,
  animation: 16,
  comedy: 35,
  drama: 18,
  family: 10751,
  fantasy: 14,
  horror: 27,
  romance: 10749,
  scifi: 878,
  thriller: 53,
  tvMovie: 10770,
  documentary: 99,
} as const;

export type Affinity = Map<number, number>;

/**
 * TV genres bundle several movie genres (e.g. "Action & Adventure") → map them to the matching movie genres
 * so movie and series taste share one score table.
 */
const TV_TO_MOVIE_GENRES: Record<number, number[]> = {
  10759: [28, 12], // Action & Adventure
  10765: [878, 14], // Sci-Fi & Fantasy
  10768: [10752], // War & Politics
  10762: [10751], // Kids
  10763: [99], // News
  10766: [18], // Soap
  10764: [], // Reality
  10767: [], // Talk
};
export function canonicalGenres(ids: readonly number[]): number[] {
  const out = new Set<number>();
  for (const id of ids) for (const g of TV_TO_MOVIE_GENRES[id] ?? [id]) out.add(g);
  return [...out];
}

/** Genre affinity: sum of signal weights, halved every HALF_LIFE_DAYS. */
export function genreAffinity(events: SignalEvent[], now: number): Affinity {
  const aff: Affinity = new Map();
  for (const e of events) {
    const ageDays = Math.max(0, (now - e.at) / DAY);
    const decay = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    const w = SIGNAL_WEIGHT[e.type] * decay;
    for (const g of canonicalGenres(e.genreIds)) aff.set(g, (aff.get(g) ?? 0) + w);
  }
  return aff;
}

export function topGenres(aff: Affinity, n: number, exclude: readonly number[] = []): number[] {
  return [...aff.entries()]
    .filter(([g, s]) => s > 0.5 && !exclude.includes(g))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([g]) => g);
}

/** "% match" badge (55–98) from genre affinity. null when there is not enough data. */
export function matchPercent(genreIds: readonly number[], aff: Affinity): number | null {
  const max = Math.max(0, ...aff.values());
  const ids = canonicalGenres(genreIds);
  if (max < 1 || ids.length === 0) return null;
  const scores = ids.map((g) => Math.max(-max, Math.min(max, aff.get(g) ?? 0)) / max);
  // favor the best-matching genre, plus the average so titles matching several genres score higher
  const best = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const s = Math.max(0, Math.min(1, 0.7 * best + 0.3 * avg));
  return Math.round(55 + 43 * s);
}

// ---------------------------------------------------------------------------

export type ContextKey =
  | "weekend-horror"
  | "short"
  | "vietnamese"
  | "korean"
  | "halloween"
  | "christmas"
  | "family"
  | "kdrama"
  | "anime"
  /** short series (miniseries) & completed series */
  | "miniseries"
  | "completed";

/** Page scope: Home (both), Movies, Series */
export type FeedScope = "all" | "movie" | "tv";
type Media = "movie" | "tv";
/** Watch services with their own "New on …" row */

export type TvListKind = "trending" | "on_the_air" | "top_rated" | "airing_today" | "popular";

/** media: the row's media type (absent = movie; for continue/watchlist absent = any type) */
export type RowSpec =
  | { id: string; kind: "continue"; media?: Media }
  | { id: string; kind: "watchlist"; media?: Media }
  | { id: string; kind: "top10"; media?: Media }
  | { id: string; kind: "trending" }
  | { id: string; kind: "because"; movie: MovieLite; reason: "like" | "watchlist" | "view" }
  | { id: string; kind: "genre"; genreId: number; media?: Media }
  | { id: string; kind: "explore"; genreId: number; media?: Media }
  | { id: string; kind: "classics" }
  | { id: string; kind: "list"; category: MovieCategory }
  | { id: string; kind: "context"; context: ContextKey }
  | { id: string; kind: "tv"; list: TvListKind }
  /** recently released & available on a service (JustWatch data) — no media: mixes movies + series */
  | { id: string; kind: "provider"; provider: StreamingService; media?: Media }
  /** topic (THEMES) — followed: the user follows it */
  | { id: string; kind: "topic"; slug: string; media: Media; followed: boolean };

/** Topic passed to the engine: slug + its own media type (if any) */
export interface TopicInput {
  slug: string;
  media?: Media;
}

export interface ProfileInput {
  events: SignalEvent[];
  history: { movie: MovieLite; at: number }[];
  watchlist: { movie: MovieLite; at: number }[];
  reactions: Record<string, { reaction: Reaction; movie: MovieLite; at: number }>;
}

export interface BuildOptions {
  now: Date;
  /** valid genre ids (from /genre/movie/list) — used for the "explore" row */
  allGenreIds: readonly number[];
  maxRows?: number;
  /** defaults to 'all' (Home). For 'tv', allGenreIds are TV genres */
  scope?: FeedScope;
  /** topics the user follows (newest first) */
  followedTopics?: TopicInput[];
  /** the user's streaming service: adds a "new on <service>" row */
  streaming?: StreamingService | null;
}

/** Topics suggested per page when the user follows none */
const SUGGESTED_TOPICS: Record<FeedScope, TopicInput[]> = {
  all: [],
  movie: [{ slug: "survival" }],
  tv: [{ slug: "cultivation", media: "tv" }, { slug: "survival" }],
};

/** Adds topic rows: followed → high score; suggested → medium score. Skips topics that do not fit the page type. */
function addTopicRows(
  add: (spec: RowSpec, score: number) => void,
  opts: BuildOptions,
  scope: FeedScope,
  rnd: () => number,
  boost: (slug: string) => number,
) {
  const followed = opts.followedTopics ?? [];
  const mediaFor = (t: TopicInput): Media | null => {
    if (scope === "all") return t.media ?? "movie";
    // series-only topics never show on the Movies page
    if (t.media && t.media !== scope) return null;
    return scope;
  };
  followed.slice(0, 4).forEach((t, i) => {
    const media = mediaFor(t);
    if (media)
      add(
        { id: `topic-${t.slug}`, kind: "topic", slug: t.slug, media, followed: true },
        81 - i * 4,
      );
  });
  const followedSet = new Set(followed.map((t) => t.slug));
  for (const t of SUGGESTED_TOPICS[scope]) {
    const media = mediaFor(t);
    if (media && !followedSet.has(t.slug))
      add(
        { id: `topic-${t.slug}`, kind: "topic", slug: t.slug, media, followed: false },
        44 + rnd() * 8 + boost(t.slug),
      );
  }
}

/** Movie genre → matching TV genre (TV has no Horror, Romance…) */
const MOVIE_TO_TV_GENRE: Record<number, number> = {
  28: 10759,
  12: 10759,
  878: 10765,
  14: 10765,
  10752: 10768,
  16: 16,
  35: 35,
  80: 80,
  99: 99,
  18: 18,
  10751: 10751,
  9648: 9648,
  37: 37,
};
export function toTvGenres(movieGenres: number[]): number[] {
  return [...new Set(movieGenres.map((g) => MOVIE_TO_TV_GENRE[g]).filter((g): g is number => !!g))];
}

const isMedia = (m: MovieLite, media: Media) => (m.media_type ?? "movie") === media;
const scoped = <T extends { movie: MovieLite }>(list: T[], scope: FeedScope) =>
  scope === "all" ? list : list.filter((e) => isMedia(e.movie, scope));

/** PRNG seeded by the date → row order is stable within a day and changes the next day. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const daySeed = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

/** Picks up to n "seed" titles for "Because you …" rows — strongest + most recent. */
export function pickSeeds(input: ProfileInput, now: number, n: number) {
  const scored = new Map<
    string,
    { movie: MovieLite; score: number; reason: "like" | "watchlist" | "view" }
  >();
  const add = (movie: MovieLite, at: number, w: number, reason: "like" | "watchlist" | "view") => {
    const decay = Math.pow(0.5, Math.max(0, now - at) / DAY / 14);
    const score = w * decay;
    const cur = scored.get(mediaKey(movie));
    if (!cur || cur.score < score) scored.set(mediaKey(movie), { movie, score, reason });
  };
  for (const r of Object.values(input.reactions))
    if (r.reaction === "like") add(r.movie, r.at, 4, "like");
  for (const e of input.watchlist) add(e.movie, e.at, 3, "watchlist");
  for (const e of input.history.slice(0, 10)) add(e.movie, e.at, 1, "view");
  const disliked = new Set(
    Object.values(input.reactions)
      .filter((r) => r.reaction === "dislike")
      .map((r) => mediaKey(r.movie)),
  );
  return [...scored.values()]
    .filter((s) => !disliked.has(mediaKey(s.movie)))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * Builds the home page rows. Each row has a score; sorted descending.
 * New users (no signals yet) get a "general" layout + context rows.
 */
export function buildRows(input: ProfileInput, opts: BuildOptions): RowSpec[] {
  const scope = opts.scope ?? "all";
  if (scope === "tv") return buildTvRows(input, opts);
  const now = opts.now;
  const rnd = seededRandom(daySeed(now));
  const aff = genreAffinity(input.events, now.getTime());
  const hasProfile = topGenres(aff, 1).length > 0;
  const scored: { spec: RowSpec; score: number }[] = [];
  const add = (spec: RowSpec, score: number) => scored.push({ spec, score });
  const media = scope === "movie" ? ("movie" as const) : undefined;

  add({ id: "top10", kind: "top10" }, 95);
  if (scoped(input.history, scope).length >= 2)
    add({ id: "continue", kind: "continue", media }, 92);
  if (scoped(input.watchlist, scope).length >= 1)
    add({ id: "watchlist", kind: "watchlist", media }, hasProfile ? 86 : 70);

  // "Because you liked/watched X" (Movies page: movie seeds only)
  pickSeeds(scopeInput(input, scope), now.getTime(), 3).forEach((s, i) =>
    add(
      { id: `because-${mediaKey(s.movie)}`, kind: "because", movie: s.movie, reason: s.reason },
      88 - i * 9,
    ),
  );

  // Favorite genres
  const favs = topGenres(aff, 3);
  favs.forEach((g, i) => add({ id: `genre-${g}`, kind: "genre", genreId: g }, 84 - i * 7));

  // Explore: one genre the user has not interacted with (avoiding negatively scored genres)
  if (hasProfile) {
    const candidates = opts.allGenreIds.filter(
      (g) => !aff.has(g) && g !== GENRE.tvMovie && g !== GENRE.documentary,
    );
    const g = candidates[Math.floor(rnd() * candidates.length)];
    if (g !== undefined) {
      add({ id: `explore-${g}`, kind: "explore", genreId: g }, 48 + rnd() * 10);
    }
  }

  add({ id: "trending", kind: "trending" }, hasProfile ? 58 : 80);
  add({ id: "now_playing", kind: "list", category: "now_playing" }, hasProfile ? 62 : 76);
  add({ id: "upcoming", kind: "list", category: "upcoming" }, hasProfile ? 54 : 66);
  if (!hasProfile) add({ id: "popular", kind: "list", category: "popular" }, 72);
  add({ id: "classics", kind: "classics" }, hasProfile ? 50 : 60);
  if (opts.streaming)
    add(
      { id: "streaming", kind: "provider", provider: opts.streaming, media },
      hasProfile ? 60 : 74,
    );

  // Series (Home only)
  if (scope === "all") {
    add({ id: "tv-trending", kind: "tv", list: "trending" }, hasProfile ? 66 : 78);
    add({ id: "tv-on_the_air", kind: "tv", list: "on_the_air" }, hasProfile ? 56 : 62);
    add({ id: "tv-top_rated", kind: "tv", list: "top_rated" }, 44);
    add({ id: "ctx-kdrama", kind: "context", context: "kdrama" }, 45 + rnd() * 8);
    add({ id: "ctx-completed", kind: "context", context: "completed" }, 40 + rnd() * 6);
  }
  addTopicRows(add, opts, scope, rnd, () => 0);

  // Time-of-year context
  const dow = now.getDay(); // 0 CN … 5 T6, 6 T7
  const hour = now.getHours();
  const month = now.getMonth(); // 0-based
  const weekendNight = (dow === 5 && hour >= 17) || dow === 6 || (dow === 0 && hour < 4);
  const horrorAff = aff.get(GENRE.horror) ?? 0;
  if (month === 9) add({ id: "ctx-halloween", kind: "context", context: "halloween" }, 82);
  else if (weekendNight && horrorAff >= 0)
    add(
      { id: "ctx-weekend-horror", kind: "context", context: "weekend-horror" },
      64 + Math.min(horrorAff, 10),
    );
  if (month === 11) add({ id: "ctx-christmas", kind: "context", context: "christmas" }, 82);
  const tet = month === 0 || month === 1;
  add({ id: "ctx-vietnamese", kind: "context", context: "vietnamese" }, tet ? 80 : 52);
  if (tet) add({ id: "ctx-family", kind: "context", context: "family" }, 74);
  add({ id: "ctx-korean", kind: "context", context: "korean" }, 40 + rnd() * 8);
  // Weeknights: suggest short movies
  const weekdayNight = dow >= 1 && dow <= 4 && hour >= 20;
  add({ id: "ctx-short", kind: "context", context: "short" }, weekdayNight ? 70 : 42);

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.maxRows ?? 15)
    .map((s) => s.spec);
}

/** Keeps only signals of the current media type (Movies / Series page) */
function scopeInput(input: ProfileInput, scope: FeedScope): ProfileInput {
  if (scope === "all") return input;
  return {
    ...input,
    history: scoped(input.history, scope),
    watchlist: scoped(input.watchlist, scope),
    reactions: Object.fromEntries(
      Object.entries(input.reactions).filter(([, r]) => isMedia(r.movie, scope)),
    ),
  };
}

/** Series page: series-only rows using the shared taste (movie genres mapped to TV genres). */
function buildTvRows(input: ProfileInput, opts: BuildOptions): RowSpec[] {
  const now = opts.now;
  const rnd = seededRandom(daySeed(now) + 7);
  const aff = genreAffinity(input.events, now.getTime());
  const hasProfile = topGenres(aff, 1).length > 0;
  const scored: { spec: RowSpec; score: number }[] = [];
  const add = (spec: RowSpec, score: number) => scored.push({ spec, score });

  add({ id: "tv-top10", kind: "top10", media: "tv" }, 95);
  if (scoped(input.history, "tv").length >= 1)
    add({ id: "tv-continue", kind: "continue", media: "tv" }, 92);
  if (scoped(input.watchlist, "tv").length >= 1)
    add({ id: "tv-watchlist", kind: "watchlist", media: "tv" }, hasProfile ? 86 : 70);
  pickSeeds(scopeInput(input, "tv"), now.getTime(), 3).forEach((s, i) =>
    add(
      { id: `because-${mediaKey(s.movie)}`, kind: "because", movie: s.movie, reason: s.reason },
      88 - i * 9,
    ),
  );

  // genre taste (movies) → TV genres
  const favs = toTvGenres(topGenres(aff, 5)).slice(0, 3);
  favs.forEach((g, i) =>
    add({ id: `tv-genre-${g}`, kind: "genre", genreId: g, media: "tv" }, 84 - i * 7),
  );
  if (hasProfile) {
    const liked = new Set(favs);
    const candidates = opts.allGenreIds.filter(
      (g) => !liked.has(g) && ![10763, 10764, 10766, 10767].includes(g),
    );
    const g = candidates[Math.floor(rnd() * candidates.length)];
    if (g !== undefined) {
      add({ id: `tv-explore-${g}`, kind: "explore", genreId: g, media: "tv" }, 48 + rnd() * 10);
    }
  }

  add({ id: "tv-on_the_air", kind: "tv", list: "on_the_air" }, hasProfile ? 64 : 80);
  add({ id: "tv-airing_today", kind: "tv", list: "airing_today" }, 58);
  add({ id: "tv-popular", kind: "tv", list: "popular" }, hasProfile ? 56 : 74);
  add({ id: "tv-top_rated", kind: "tv", list: "top_rated" }, hasProfile ? 52 : 62);
  if (opts.streaming)
    add(
      { id: "tv-streaming", kind: "provider", provider: opts.streaming, media: "tv" },
      hasProfile ? 60 : 72,
    );
  add({ id: "ctx-kdrama", kind: "context", context: "kdrama" }, 60 + rnd() * 6);
  add({ id: "ctx-anime", kind: "context", context: "anime" }, 50 + rnd() * 6);
  add({ id: "ctx-miniseries", kind: "context", context: "miniseries" }, 55 + rnd() * 6);
  add({ id: "ctx-completed", kind: "context", context: "completed" }, 57 + rnd() * 6);
  // likes animation / fantasy → push the cultivation suggestion up
  const fantasy = Math.max(aff.get(GENRE.animation) ?? 0, aff.get(GENRE.fantasy) ?? 0);
  addTopicRows(add, opts, "tv", rnd, (slug) => (slug === "cultivation" && fantasy > 0 ? 14 : 0));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.maxRows ?? 15)
    .map((s) => s.spec);
}

// ---------------------------------------------------------------------------
// Special row layouts

export type RowLayout = "default" | "spotlight" | "large";

/** Rows that can get a featured card at the start, in priority order (lower = higher priority) */
function spotlightPriority(spec: RowSpec): number | null {
  switch (spec.kind) {
    case "topic":
      return spec.followed ? 0 : 3;
    case "because":
      return spec.reason === "like" ? 1 : 2;
    case "context":
      return spec.context === "completed" ? 2 : spec.context === "miniseries" ? 3 : null;
    case "classics":
      return 4;
    default:
      return null;
  }
}

/** At least this many regular rows between 2 featured rows — rare enough to feel "special" */
export const SPOTLIGHT_SPACING = 3;
export const MAX_SPOTLIGHTS = 3;

/**
 * Picks which rows get a distinctive layout:
 * - "Upcoming" → large posters (with a countdown)
 * - up to 3 spotlight rows, at least 3 rows apart; followed topics, "Because you liked…", "Completed"… first
 */
export function assignLayouts(rows: RowSpec[]): Record<string, RowLayout> {
  const out: Record<string, RowLayout> = {};
  rows.forEach((r) => {
    if (r.kind === "list" && r.category === "upcoming") out[r.id] = "large";
  });
  const candidates = rows
    .map((r, index) => ({ r, index, p: spotlightPriority(r) }))
    .filter((c): c is { r: RowSpec; index: number; p: number } => c.p !== null && !out[c.r.id])
    .sort((a, b) => a.p - b.p || a.index - b.index);
  const taken: number[] = [];
  for (const c of candidates) {
    if (taken.length >= MAX_SPOTLIGHTS) break;
    if (taken.some((i) => Math.abs(i - c.index) < SPOTLIGHT_SPACING)) continue;
    // never next to a large-poster row
    const before = rows[c.index - 1];
    const after = rows[c.index + 1];
    if (before && out[before.id] === "large") continue;
    if (after && out[after.id] === "large") continue;
    taken.push(c.index);
    out[c.r.id] = "spotlight";
  }
  return out;
}
