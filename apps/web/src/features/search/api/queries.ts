import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  normalizeTvPage,
  tmdbFetch,
  type MediaType,
  type MovieSummary,
  type Paginated,
  type RawTvSummary,
} from "@/lib/tmdb";
import { useTmdbLocale } from "@/stores/preferences";
import { nextPageParam } from "@/features/movies/api/queries";

/** Searches movies or series (series normalized to the movie shape). */
export function useSearchMedia(query: string, type: MediaType) {
  const { language } = useTmdbLocale();
  const q = query.trim();
  return useInfiniteQuery({
    queryKey: ["search", type, q, language] as const,
    queryFn: ({ pageParam, signal }): Promise<Paginated<MovieSummary>> => {
      const params = { query: q, language, page: pageParam, include_adult: false };
      return type === "tv"
        ? tmdbFetch<Paginated<RawTvSummary>>("/search/tv", params, signal).then(normalizeTvPage)
        : tmdbFetch<Paginated<MovieSummary>>("/search/movie", params, signal);
    },
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  });
}

export interface PersonResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  known_for?: { id: number; media_type: "movie" | "tv"; title?: string; name?: string }[];
}

/** Searches people (actors, directors, writers…) */
export function useSearchPeople(query: string, enabled = true) {
  const { language } = useTmdbLocale();
  const q = query.trim();
  return useInfiniteQuery({
    queryKey: ["search", "person", q, language] as const,
    queryFn: ({ pageParam, signal }) =>
      tmdbFetch<Paginated<PersonResult>>(
        "/search/person",
        { query: q, language, page: pageParam, include_adult: false },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: enabled && q.length > 0,
    placeholderData: keepPreviousData,
  });
}

export interface KeywordResult {
  id: number;
  name: string;
}

/**
 * TMDB keywords related to the search query (to browse titles by topic).
 * The API returns them in arbitrary order → exact matches first, then prefix matches, then substring matches; shorter first.
 */
export function useKeywordSuggestions(query: string, limit = 12) {
  const q = query.trim().toLowerCase();
  return useQuery({
    queryKey: ["search", "keyword", q] as const,
    queryFn: async ({ signal }) => {
      const res = await tmdbFetch<Paginated<KeywordResult>>(
        "/search/keyword",
        { query: q },
        signal,
      );
      return rankKeywords(res.results, q).slice(0, limit);
    },
    enabled: q.length > 1,
    staleTime: 24 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function rankKeywords(list: KeywordResult[], query: string): KeywordResult[] {
  const q = query.trim().toLowerCase();
  const score = (k: KeywordResult) => {
    const n = k.name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (n.split(/\s+/).some((w) => w.startsWith(q))) return 2;
    return 3;
  };
  return [...list].sort((a, b) => score(a) - score(b) || a.name.length - b.name.length);
}
