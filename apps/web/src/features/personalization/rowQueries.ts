import { queryOptions } from "@tanstack/react-query";
import {
  normalizeTvPage,
  tmdbFetch,
  type MovieSummary,
  type Paginated,
  type QueryParams,
  type RawTvSummary,
} from "@/lib/tmdb";
import type { ContextKey, RowSpec } from "./engine";
import type { StreamingService } from "@/stores/preferences";
import { interleave, isoDayOffset } from "./interleave";
import { GENRE } from "./engine";
import { queryClient } from "@/app/queryClient";
import { themeBySlug, themeParams } from "@/features/discover/catalog";
import { themeKeywordsQuery } from "@/features/discover/api/queries";

interface Ctx {
  language: string;
  region: string;
}

const list = (path: string, params: QueryParams, signal?: AbortSignal) =>
  tmdbFetch<Paginated<MovieSummary>>(path, params, signal).then((d) => d.results);

const tvList = (path: string, params: QueryParams, signal?: AbortSignal) =>
  tmdbFetch<Paginated<RawTvSummary>>(path, params, signal).then((d) => normalizeTvPage(d).results);

const discover = (params: QueryParams, ctx: Ctx, signal?: AbortSignal) =>
  list(
    "/discover/movie",
    {
      language: ctx.language,
      region: ctx.region,
      include_adult: false,
      sort_by: "popularity.desc",
      ...params,
    },
    signal,
  );

/** Looks up a TMDB keyword id by name (e.g. "halloween") and discovers by that keyword. */
async function discoverByKeyword(keyword: string, ctx: Ctx, signal?: AbortSignal) {
  const res = await tmdbFetch<Paginated<{ id: number; name: string }>>(
    "/search/keyword",
    { query: keyword },
    signal,
  );
  const kw = res.results.find((k) => k.name.toLowerCase() === keyword) ?? res.results[0];
  if (!kw) return [];
  return discover({ with_keywords: kw.id, "vote_count.gte": 50 }, ctx, signal);
}

const CONTEXT_FETCHERS: Record<
  ContextKey,
  (ctx: Ctx, signal?: AbortSignal) => Promise<MovieSummary[]>
> = {
  "weekend-horror": (ctx, s) =>
    discover({ with_genres: GENRE.horror, "vote_count.gte": 300 }, ctx, s),
  halloween: (ctx, s) => discoverByKeyword("halloween", ctx, s),
  christmas: (ctx, s) => discoverByKeyword("christmas", ctx, s),
  short: (ctx, s) =>
    discover(
      {
        "with_runtime.gte": 60,
        "with_runtime.lte": 95,
        "vote_count.gte": 500,
        "vote_average.gte": 6.5,
      },
      ctx,
      s,
    ),
  vietnamese: (ctx, s) => discover({ with_original_language: "vi", "vote_count.gte": 5 }, ctx, s),
  korean: (ctx, s) => discover({ with_original_language: "ko", "vote_count.gte": 200 }, ctx, s),
  family: (ctx, s) =>
    discover({ with_genres: `${GENRE.family}|${GENRE.animation}`, "vote_count.gte": 300 }, ctx, s),
  anime: (ctx, s) =>
    tvList(
      "/discover/tv",
      {
        language: ctx.language,
        with_original_language: "ja",
        with_genres: 16,
        sort_by: "popularity.desc",
        "vote_count.gte": 100,
      },
      s,
    ),
  miniseries: (ctx, s) =>
    tvList(
      "/discover/tv",
      {
        language: ctx.language,
        with_type: 2,
        sort_by: "popularity.desc",
        "vote_count.gte": 100,
        "vote_average.gte": 7,
      },
      s,
    ),
  completed: (ctx, s) =>
    tvList(
      "/discover/tv",
      {
        language: ctx.language,
        with_status: 3,
        sort_by: "popularity.desc",
        "vote_count.gte": 300,
        "vote_average.gte": 7.8,
      },
      s,
    ),
  kdrama: (ctx, s) =>
    tvList(
      "/discover/tv",
      {
        language: ctx.language,
        with_original_language: "ko",
        with_genres: 18,
        sort_by: "popularity.desc",
        "vote_count.gte": 50,
      },
      s,
    ),
};

/** Topic row: resolve keywords (sharing the Browse page cache) and discover by media type */
async function topicRow(slug: string, media: "movie" | "tv", ctx: Ctx, signal?: AbortSignal) {
  const theme = themeBySlug(slug);
  if (!theme) return [];
  const keywords = await queryClient.query({ ...themeKeywordsQuery(theme), staleTime: "static" });
  const params = {
    ...themeParams(theme, media, keywords),
    sort_by: "popularity.desc",
    include_adult: false,
    language: ctx.language,
  };
  return media === "tv"
    ? tvList("/discover/tv", { ...params, "vote_count.gte": 20 }, signal)
    : list("/discover/movie", { ...params, region: ctx.region, "vote_count.gte": 50 }, signal);
}

/**
 * "New on <service>": TMDB has no per-service date added, so take
 * movies released in the last 6 months / series with an episode aired in the last 45 days
 * that are currently on that service (subscription / ads / free) in the selected region.
 */
async function providerRow(
  provider: StreamingService,
  media: "movie" | "tv" | undefined,
  ctx: Ctx,
  signal?: AbortSignal,
) {
  const now = new Date();
  const today = isoDayOffset(now, 0);
  const base = {
    language: ctx.language,
    watch_region: ctx.region,
    with_watch_providers: provider.id,
    with_watch_monetization_types: "flatrate|free|ads",
    include_adult: false,
    sort_by: "popularity.desc",
  };
  const movies = () =>
    list(
      "/discover/movie",
      {
        ...base,
        "primary_release_date.gte": isoDayOffset(now, -180),
        "primary_release_date.lte": today,
      },
      signal,
    );
  const shows = () =>
    tvList(
      "/discover/tv",
      { ...base, "air_date.gte": isoDayOffset(now, -45), "air_date.lte": today },
      signal,
    );
  if (media === "movie") return movies();
  if (media === "tv") return shows();
  const [m, t] = await Promise.all([movies(), shows()]);
  return interleave(m, t);
}

type RemoteSpec = Exclude<RowSpec, { kind: "continue" } | { kind: "watchlist" }>;

/** Query per row type. Keys only depend on the data they need so the cache is shared across renders. */
export function rowQuery(spec: RemoteSpec, ctx: Ctx) {
  const key = (...parts: (string | number)[]): (string | number)[] => [
    "home-row",
    ctx.language,
    ctx.region,
    ...parts,
  ];
  switch (spec.kind) {
    case "top10":
      return queryOptions({
        queryKey: key("top10", spec.media ?? "movie"),
        queryFn: ({ signal }) =>
          (spec.media === "tv"
            ? tvList("/trending/tv/week", { language: ctx.language }, signal)
            : list("/trending/movie/week", { language: ctx.language }, signal)
          ).then((r) => r.slice(0, 10)),
      });
    case "trending":
      return queryOptions({
        queryKey: key("trending-day"),
        queryFn: ({ signal }) => list("/trending/movie/day", { language: ctx.language }, signal),
      });
    case "because":
      return queryOptions({
        queryKey: key("because", spec.movie.media_type ?? "movie", spec.movie.id),
        queryFn: ({ signal }) =>
          spec.movie.media_type === "tv"
            ? tvList(`/tv/${spec.movie.id}/recommendations`, { language: ctx.language }, signal)
            : list(`/movie/${spec.movie.id}/recommendations`, { language: ctx.language }, signal),
      });
    case "genre":
    case "explore":
      return queryOptions({
        queryKey: key("genre", spec.media ?? "movie", spec.genreId),
        queryFn: ({ signal }) =>
          spec.media === "tv"
            ? tvList(
                "/discover/tv",
                {
                  language: ctx.language,
                  with_genres: spec.genreId,
                  sort_by: "popularity.desc",
                  "vote_count.gte": 100,
                },
                signal,
              )
            : discover({ with_genres: spec.genreId, "vote_count.gte": 150 }, ctx, signal),
      });
    case "classics":
      return queryOptions({
        queryKey: key("classics"),
        queryFn: ({ signal }) => list("/movie/top_rated", { language: ctx.language }, signal),
      });
    case "list":
      return queryOptions({
        queryKey: key("list", spec.category),
        queryFn: ({ signal }) =>
          list(`/movie/${spec.category}`, { language: ctx.language, region: ctx.region }, signal),
      });
    case "tv":
      return queryOptions({
        queryKey: key("tv", spec.list),
        queryFn: ({ signal }) =>
          tvList(
            spec.list === "trending" ? "/trending/tv/week" : `/tv/${spec.list}`,
            { language: ctx.language },
            signal,
          ),
      });
    case "topic":
      return queryOptions({
        queryKey: key("topic", spec.slug, spec.media),
        queryFn: ({ signal }) => topicRow(spec.slug, spec.media, ctx, signal),
      });
    case "provider":
      return queryOptions({
        queryKey: key("provider", spec.provider.id, spec.media ?? "all"),
        queryFn: ({ signal }) => providerRow(spec.provider, spec.media, ctx, signal),
      });
    case "context":
      return queryOptions({
        queryKey: key("context", spec.context),
        queryFn: ({ signal }) => CONTEXT_FETCHERS[spec.context](ctx, signal),
      });
  }
}
