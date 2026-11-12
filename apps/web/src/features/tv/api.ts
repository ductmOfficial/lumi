import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  type QueryFunction,
} from "@tanstack/react-query";
import {
  normalizeTvDetail,
  normalizeTvPage,
  tmdbFetch,
  type MediaType,
  type MovieDetail,
  type MovieSummary,
  type Paginated,
  type RawTvDetail,
  type RawTvSummary,
  type Review,
  type SeasonDetail,
} from "@/lib/tmdb";
import { useTmdbLocale } from "@/stores/preferences";
import { movieDetailQuery, nextPageParam } from "@/features/movies/api/queries";

export const TV_CATEGORIES = ["on_the_air", "airing_today", "popular", "top_rated"] as const;
export type TvCategory = (typeof TV_CATEGORIES)[number];

export function tvDetailQuery(id: number, language: string, region: string) {
  const lang = language.slice(0, 2);
  return queryOptions({
    queryKey: ["tv", "detail", id, language, region] as const,
    queryFn: async ({ signal }) => {
      const raw = await tmdbFetch<RawTvDetail>(
        `/tv/${id}`,
        {
          language,
          append_to_response:
            "aggregate_credits,videos,images,content_ratings,keywords,external_ids,similar,recommendations,watch/providers",
          include_video_language: `${lang},en,null`,
          include_image_language: `${lang},en,null`,
        },
        signal,
      );
      if (!raw.overview && lang !== "en") {
        const en = await tmdbFetch<Pick<RawTvDetail, "overview" | "tagline">>(
          `/tv/${id}`,
          { language: "en-US" },
          signal,
        );
        raw.overview = en.overview;
        raw.tagline ||= en.tagline;
      }
      return normalizeTvDetail(raw);
    },
  });
}

/** Movie or series details (normalized to MovieDetail). */
export function useMediaDetail(type: MediaType, id: number) {
  const { language, region } = useTmdbLocale();
  const opts =
    type === "tv" ? tvDetailQuery(id, language, region) : movieDetailQuery(id, language, region);
  // the two kinds have differently typed query keys → cast to the shared shape
  return useQuery({
    queryKey: opts.queryKey,
    queryFn: opts.queryFn as QueryFunction<MovieDetail>,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function mediaReviewsInfiniteQuery(type: MediaType, id: number) {
  return infiniteQueryOptions({
    queryKey: [type, "reviews", id] as const,
    queryFn: ({ pageParam, signal }) =>
      tmdbFetch<Paginated<Review>>(`/${type}/${id}/reviews`, { page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useMediaReviews(type: MediaType, id: number) {
  return useInfiniteQuery({
    ...mediaReviewsInfiniteQuery(type, id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useSeason(tvId: number, seasonNumber: number | null) {
  const { language } = useTmdbLocale();
  return useQuery({
    queryKey: ["tv", tvId, "season", seasonNumber, language] as const,
    queryFn: async ({ signal }) => {
      const season = await tmdbFetch<SeasonDetail>(
        `/tv/${tvId}/season/${seasonNumber}`,
        { language },
        signal,
      );
      // episode has no localized overview → use the English one
      if (!language.startsWith("en") && season.episodes.some((e) => !e.overview)) {
        const en = await tmdbFetch<SeasonDetail>(
          `/tv/${tvId}/season/${seasonNumber}`,
          { language: "en-US" },
          signal,
        );
        const byId = new Map(en.episodes.map((e) => [e.id, e]));
        season.episodes = season.episodes.map((e) =>
          e.overview ? e : { ...e, overview: byId.get(e.id)?.overview ?? "" },
        );
      }
      return season;
    },
    enabled: Number.isFinite(tvId) && seasonNumber !== null,
    staleTime: 1000 * 60 * 30,
  });
}

// ---- series lists ----
export const tvList = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
) => tmdbFetch<Paginated<RawTvSummary>>(path, params, signal).then(normalizeTvPage);

export function tvListInfiniteQuery(category: TvCategory, language: string) {
  return infiniteQueryOptions({
    queryKey: ["tv", "list", category, language] as const,
    queryFn: ({ pageParam, signal }) =>
      tvList(`/tv/${category}`, { language, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

export function useTvListInfinite(category: TvCategory) {
  const { language } = useTmdbLocale();
  return useInfiniteQuery(tvListInfiniteQuery(category, language));
}

export type { MovieSummary };
