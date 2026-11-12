import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  tmdbFetch,
  type Collection,
  type MovieDetail,
  type MovieSummary,
  type Paginated,
} from "@/lib/tmdb";
import { useTmdbLocale } from "@/stores/preferences";

export type TrendingWindow = "day" | "week";
export const MOVIE_CATEGORIES = ["now_playing", "upcoming", "top_rated", "popular"] as const;
export type MovieCategory = (typeof MOVIE_CATEGORIES)[number];

export const isMovieCategory = (v: string | undefined): v is MovieCategory =>
  !!v && (MOVIE_CATEGORIES as readonly string[]).includes(v);

/** TMDB caps results at 500 pages. */
const MAX_PAGE = 500;
export const nextPageParam = (last: Paginated<unknown>) =>
  last.page < Math.min(last.total_pages, MAX_PAGE) ? last.page + 1 : undefined;

export const movieKeys = {
  all: ["movies"] as const,
  trending: (window: TrendingWindow, language: string) =>
    [...movieKeys.all, "trending", window, language] as const,
  list: (category: MovieCategory, language: string, region: string) =>
    [...movieKeys.all, "list", category, language, region] as const,
  detail: (id: number, language: string, region: string) =>
    [...movieKeys.all, "detail", id, language, region] as const,
};

export function trendingMoviesQuery(window: TrendingWindow, language: string) {
  return queryOptions({
    queryKey: movieKeys.trending(window, language),
    queryFn: ({ signal }) =>
      tmdbFetch<Paginated<MovieSummary>>(`/trending/movie/${window}`, { language }, signal),
  });
}

export function movieListInfiniteQuery(category: MovieCategory, language: string, region: string) {
  return infiniteQueryOptions({
    queryKey: movieKeys.list(category, language, region),
    queryFn: ({ pageParam, signal }) =>
      tmdbFetch<Paginated<MovieSummary>>(
        `/movie/${category}`,
        { language, region, page: pageParam },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
}

/**
 * Movie details + credits, videos, similar, recommendations and watch providers in one request.
 * If the current language has no translated content, fall back to the English overview/tagline.
 */
export function movieDetailQuery(id: number, language: string, region: string) {
  const lang = language.slice(0, 2);
  return queryOptions({
    queryKey: movieKeys.detail(id, language, region),
    queryFn: async ({ signal }) => {
      const detail = await tmdbFetch<MovieDetail>(
        `/movie/${id}`,
        {
          language,
          append_to_response:
            "credits,videos,images,release_dates,keywords,external_ids,similar,recommendations,watch/providers",
          // videos & images: current language + English + no language
          include_video_language: `${lang},en,null`,
          include_image_language: `${lang},en,null`,
        },
        signal,
      );
      if (!detail.overview && lang !== "en") {
        const fallback = await tmdbFetch<Pick<MovieDetail, "overview" | "tagline">>(
          `/movie/${id}`,
          { language: "en-US" },
          signal,
        );
        detail.overview = fallback.overview;
        detail.tagline ||= fallback.tagline;
      }
      return detail;
    },
  });
}

export function collectionQuery(id: number, language: string) {
  return queryOptions({
    queryKey: ["collection", id, language] as const,
    queryFn: ({ signal }) => tmdbFetch<Collection>(`/collection/${id}`, { language }, signal),
    staleTime: Infinity,
  });
}

// ---- hooks (language/region come from preferences) ----

export function useTrendingMovies(window: TrendingWindow) {
  const { language } = useTmdbLocale();
  return useQuery(trendingMoviesQuery(window, language));
}

export function useMovieListFirstPage(category: MovieCategory) {
  const { language, region } = useTmdbLocale();
  return useInfiniteQuery({
    ...movieListInfiniteQuery(category, language, region),
    select: (d) => d.pages[0]?.results,
  });
}

export function useMovieListInfinite(category: MovieCategory) {
  const { language, region } = useTmdbLocale();
  return useInfiniteQuery(movieListInfiniteQuery(category, language, region));
}

export function useCollection(id: number | undefined) {
  const { language } = useTmdbLocale();
  return useQuery({ ...collectionQuery(id ?? 0, language), enabled: !!id });
}
