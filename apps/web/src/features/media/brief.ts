import { queryOptions, useQuery } from "@tanstack/react-query";
import { tmdbFetch, type MediaType } from "@/lib/tmdb";
import { formatRuntime } from "@/lib/format";
import { useT } from "@/i18n/useT";

/** Short card info: runtime (movies) or season count (series). Language-independent. */
export interface MediaBrief {
  runtime: number | null;
  seasons?: number;
  episodes?: number;
}

interface RawBrief {
  runtime?: number | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
}

export function briefQuery(type: MediaType, id: number) {
  return queryOptions({
    queryKey: ["brief", type, id] as const,
    queryFn: async ({ signal }): Promise<MediaBrief> => {
      const raw = await tmdbFetch<RawBrief>(`/${type}/${id}`, {}, signal);
      return type === "tv"
        ? {
            runtime: raw.episode_run_time?.[0] ?? null,
            seasons: raw.number_of_seasons,
            episodes: raw.number_of_episodes,
          }
        : { runtime: raw.runtime ?? null };
    },
    // this data almost never changes
    staleTime: 7 * 24 * 3600e3,
    gcTime: 24 * 3600e3,
  });
}

/** "2h 15m" for movies, "3 seasons" for series; undefined when missing / unknown */
export function useMediaBriefText(m: { id: number; media_type?: MediaType }, enabled: boolean) {
  const t = useT();
  const type = m.media_type ?? "movie";
  const { data } = useQuery({ ...briefQuery(type, m.id), enabled });
  if (!data) return undefined;
  if (type === "tv") return data.seasons ? t("tv.seasons", { n: data.seasons }) : undefined;
  return formatRuntime(data.runtime) ?? undefined;
}
