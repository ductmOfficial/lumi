import { queryOptions } from "@tanstack/react-query";
import { tmdbFetch, type MediaType } from "@/lib/tmdb";
import type { MovieLite } from "@/features/personalization/types";

interface RawLite {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genres?: { id: number }[];
  overview?: string;
}

/** Minimal info for a movie/series by id — for shared lists, Watch together… */
export function liteQuery(type: MediaType, id: number, language: string) {
  return queryOptions({
    queryKey: ["lite", type, id, language] as const,
    queryFn: async ({ signal }): Promise<MovieLite & { overview?: string }> => {
      const r = await tmdbFetch<RawLite>(`/${type}/${id}`, { language }, signal);
      return {
        id: r.id,
        title: r.title ?? r.name ?? "",
        poster_path: r.poster_path,
        backdrop_path: r.backdrop_path,
        release_date: r.release_date ?? r.first_air_date ?? "",
        vote_average: r.vote_average,
        genre_ids: (r.genres ?? []).map((g) => g.id),
        overview: r.overview,
        ...(type === "tv" ? { media_type: "tv" as const } : {}),
      };
    },
    staleTime: 24 * 3600e3,
  });
}

export interface ShowStatus {
  seasons: { season_number: number; episode_count: number }[];
  last: { season_number: number; episode_number: number; air_date: string | null } | null;
  next: { season_number: number; episode_number: number; air_date: string | null } | null;
}

/** Series airing status (episodes per season, latest / upcoming episode) — for the "Up next" row */
export function showStatusQuery(id: number) {
  return queryOptions({
    queryKey: ["show-status", id] as const,
    queryFn: async ({ signal }): Promise<ShowStatus> => {
      const r = await tmdbFetch<{
        seasons: { season_number: number; episode_count: number }[];
        last_episode_to_air: ShowStatus["last"];
        next_episode_to_air: ShowStatus["next"];
      }>(`/tv/${id}`, {}, signal);
      const pick = (e: ShowStatus["last"]) =>
        e
          ? {
              season_number: e.season_number,
              episode_number: e.episode_number,
              air_date: e.air_date,
            }
          : null;
      return {
        seasons: r.seasons,
        last: pick(r.last_episode_to_air),
        next: pick(r.next_episode_to_air),
      };
    },
    staleTime: 6 * 3600e3,
  });
}

/** Next unwatched episode (aired episodes only); null when caught up */
export function nextUnseen(status: ShowStatus, seen: Set<string>) {
  const lastS = status.last?.season_number ?? Infinity;
  const lastE = status.last?.episode_number ?? Infinity;
  for (const s of [...status.seasons]
    .filter((x) => x.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number)) {
    for (let e = 1; e <= s.episode_count; e++) {
      if (s.season_number > lastS || (s.season_number === lastS && e > lastE)) return null;
      if (!seen.has(`${s.season_number}-${e}`)) return { season: s.season_number, episode: e };
    }
  }
  return null;
}
