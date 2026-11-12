import { useMemo } from "react";
import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  normalizeTvPage,
  tmdbFetch,
  type Genre,
  type MediaType,
  type MovieSummary,
  type Paginated,
  type QueryParams,
  type RawTvSummary,
} from "@/lib/tmdb";
import { useTmdbLocale } from "@/stores/preferences";
import { nextPageParam } from "@/features/movies/api/queries";
import {
  decadeRange,
  resolveThemeKeywords,
  themeBySlug,
  themeParams,
  TV_FORMAT,
  TV_STATUS,
  type Theme,
  type TvFormat,
  type TvStatus,
} from "../catalog";

export const SORT_OPTIONS = [
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
  "revenue.desc",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export interface DiscoverFilters {
  /** phim hay series */
  media: MediaType;
  genres: number[];
  year?: number;
  minRating?: number;
  sort: SortOption;
  /** original language (ISO 639-1) */
  lang?: string;
  /** decade, e.g. 1990 */
  decade?: number;
  /** topic slug in THEMES */
  theme?: string;
  /** streaming provider id (for the current region) */
  provider?: number;
  /** series only: airing / ended / canceled */
  status?: TvStatus;
  /** series only: miniseries, scripted, reality, documentary */
  format?: TvFormat;
  /** TMDB keyword ids (clicked on a detail page) — combined with AND */
  keywords?: number[];
}

/** Name of a TMDB keyword by id (cached forever) */
export function useKeywordName(id: number | undefined) {
  return useQuery({
    queryKey: ["keyword", id],
    queryFn: ({ signal }) => tmdbFetch<{ id: number; name: string }>(`/keyword/${id}`, {}, signal),
    enabled: !!id,
    staleTime: Infinity,
    select: (d) => d.name,
  });
}

/** Keyword ids of a topic (cached forever) */
export function themeKeywordsQuery(theme: Theme) {
  return queryOptions({
    queryKey: ["theme-keywords", theme.slug] as const,
    queryFn: ({ signal }) => resolveThemeKeywords(theme, signal),
    staleTime: Infinity,
  });
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priorities?: Record<string, number>;
}

/** Streaming services available in the current region, in TMDB/JustWatch priority order */
export function useWatchProviders(media: MediaType = "movie") {
  const { language, region } = useTmdbLocale();
  return useQuery({
    queryKey: ["watch-providers", media, region, language],
    queryFn: ({ signal }) =>
      tmdbFetch<{ results: WatchProvider[] }>(
        `/watch/providers/${media}`,
        { language, watch_region: region },
        signal,
      ),
    select: (d) =>
      [...d.results].sort(
        (a, b) => (a.display_priorities?.[region] ?? 999) - (b.display_priorities?.[region] ?? 999),
      ),
    staleTime: 24 * 3600e3,
  });
}

/** Shared /discover params for movies & series from the filters (except resolved keywords) */
export function discoverParams(
  filters: DiscoverFilters,
  region: string,
  theme: QueryParams | undefined,
  today: string,
): QueryParams {
  const tv = filters.media === "tv";
  const date = tv ? "first_air_date" : "primary_release_date";
  const newest = filters.sort === "primary_release_date.desc";
  const needsVotes = filters.sort === "vote_average.desc" || !!filters.minRating;
  const range = filters.decade ? decadeRange(filters.decade) : undefined;
  return {
    include_adult: false,
    region: tv ? undefined : region,
    sort_by: tv && newest ? "first_air_date.desc" : filters.sort,
    with_genres: filters.genres.join(",") || undefined,
    [tv ? "first_air_date_year" : "primary_release_year"]: filters.year,
    "vote_average.gte": filters.minRating,
    "vote_count.gte": needsVotes ? (tv ? 100 : 200) : undefined,
    [`${date}.gte`]: range?.gte,
    // Sorted by newest: only titles that are already released
    [`${date}.lte`]: newest ? (range && range.lte < today ? range.lte : today) : range?.lte,
    with_original_language: filters.lang,
    with_watch_providers: filters.provider,
    watch_region: filters.provider ? region : undefined,
    with_status: tv && filters.status ? TV_STATUS[filters.status] : undefined,
    with_type: tv && filters.format ? TV_FORMAT[filters.format] : undefined,
    ...theme,
    // hand-picked keywords AND the topic keyword group (that group is OR "a|b")
    with_keywords:
      [theme?.with_keywords, filters.keywords?.join(",")].filter(Boolean).join(",") || undefined,
  };
}

/** Series cannot be sorted by revenue */
export const sortOptionsFor = (media: MediaType): readonly SortOption[] =>
  media === "tv" ? SORT_OPTIONS.filter((s) => s !== "revenue.desc") : SORT_OPTIONS;

export function genresQuery(language: string, media: MediaType = "movie") {
  return queryOptions({
    queryKey: ["genres", media, language] as const,
    queryFn: ({ signal }) =>
      tmdbFetch<{ genres: Genre[] }>(`/genre/${media}/list`, { language }, signal),
    select: (d) => d.genres,
    staleTime: Infinity,
  });
}

export function useMovieGenres() {
  const { language } = useTmdbLocale();
  return useQuery(genresQuery(language));
}

export function useGenres(media: MediaType) {
  const { language } = useTmdbLocale();
  return useQuery(genresQuery(language, media));
}

/** Genres of both movies & series (id → name) — used to show genre names on series cards */
export function useAllGenres() {
  const movie = useGenres("movie");
  const tv = useGenres("tv");
  return useMemo(() => [...(movie.data ?? []), ...(tv.data ?? [])], [movie.data, tv.data]);
}

export function useDiscoverMovies(filters: DiscoverFilters) {
  const { language, region } = useTmdbLocale();
  const qc = useQueryClient();
  return useInfiniteQuery({
    queryKey: ["discover", filters, language, region] as const,
    queryFn: async ({ pageParam, signal }): Promise<Paginated<MovieSummary>> => {
      const today = new Date().toISOString().slice(0, 10);
      const theme = themeBySlug(filters.theme);
      const extra = theme
        ? themeParams(
            theme,
            filters.media,
            await qc.query({ ...themeKeywordsQuery(theme), staleTime: "static" }),
          )
        : undefined;
      const params = {
        ...discoverParams(filters, region, extra, today),
        language,
        page: pageParam,
      };
      if (filters.media === "tv")
        return tmdbFetch<Paginated<RawTvSummary>>("/discover/tv", params, signal).then(
          normalizeTvPage,
        );
      return tmdbFetch<Paginated<MovieSummary>>("/discover/movie", params, signal);
    },
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    placeholderData: keepPreviousData,
  });
}
