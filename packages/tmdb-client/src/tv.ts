import type {
  CastMember,
  CrewMember,
  Episode,
  ExternalIds,
  Genre,
  ImageSet,
  Keyword,
  MovieDetail,
  MovieSummary,
  Network,
  Paginated,
  RawTvSummary,
  SeasonSummary,
  Video,
  WatchProvidersByRegion,
} from "./types.js";

/**
 * Series are NORMALIZED to the movie shape (title/release_date…) + media_type: 'tv'.
 * That way cards, rows, profile pages, timelines… work for both kinds.
 */
export function normalizeTvSummary(t: RawTvSummary): MovieSummary {
  return {
    id: t.id,
    title: t.name,
    original_title: t.original_name,
    overview: t.overview,
    poster_path: t.poster_path,
    backdrop_path: t.backdrop_path,
    release_date: t.first_air_date ?? "",
    vote_average: t.vote_average,
    vote_count: t.vote_count,
    popularity: t.popularity,
    genre_ids: t.genre_ids ?? [],
    original_language: t.original_language,
    adult: t.adult ?? false,
    media_type: "tv",
  };
}

export const normalizeTvPage = (p: Paginated<RawTvSummary>): Paginated<MovieSummary> => ({
  ...p,
  results: p.results.map(normalizeTvSummary),
});

/**
 * A series as TMDB returns it. The appended responses (credits, videos, images…) and some
 * lists are only present when requested or known, so they are optional here.
 */
export interface RawTvDetail extends Omit<RawTvSummary, "genre_ids"> {
  genres: Genre[];
  tagline: string | null;
  status: string;
  type: string;
  homepage: string | null;
  in_production: boolean;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time?: number[];
  seasons?: SeasonSummary[];
  networks?: Network[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
  last_episode_to_air: Episode | null;
  next_episode_to_air: Episode | null;
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { iso_639_1: string; english_name: string; name: string }[];
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];
  aggregate_credits?: {
    cast: {
      id: number;
      name: string;
      profile_path: string | null;
      order: number;
      total_episode_count: number;
      roles: { credit_id: string; character: string; episode_count: number }[];
    }[];
    crew: {
      id: number;
      name: string;
      profile_path: string | null;
      department: string;
      total_episode_count: number;
      jobs: { credit_id: string; job: string; episode_count: number }[];
    }[];
  };
  videos?: { results: Video[] };
  images?: ImageSet;
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
  keywords?: { results: Keyword[] };
  external_ids?: ExternalIds;
  similar?: Paginated<RawTvSummary>;
  recommendations?: Paginated<RawTvSummary>;
  "watch/providers"?: { results: Record<string, WatchProvidersByRegion> };
}

export function normalizeTvDetail(t: RawTvDetail): MovieDetail {
  const cast: CastMember[] = (t.aggregate_credits?.cast ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    profile_path: c.profile_path,
    order: c.order,
    character: c.roles
      .map((r) => r.character)
      .filter(Boolean)
      .join(" / "),
    credit_id: c.roles[0]?.credit_id ?? `cast-${c.id}`,
  }));
  const crew: CrewMember[] = (t.aggregate_credits?.crew ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    profile_path: c.profile_path,
    department: c.department,
    job: c.jobs.map((j) => j.job).join(", "),
    credit_id: c.jobs[0]?.credit_id ?? `crew-${c.id}`,
  }));
  // creators (created_by) are shown as the series' "directors"
  for (const cr of t.created_by ?? []) {
    if (!crew.some((c) => c.id === cr.id && c.job.includes("Creator"))) {
      crew.unshift({
        id: cr.id,
        name: cr.name,
        profile_path: cr.profile_path,
        department: "Writing",
        job: "Creator",
        credit_id: `creator-${cr.id}`,
      });
    }
  }

  return {
    id: t.id,
    title: t.name,
    original_title: t.original_name,
    overview: t.overview,
    poster_path: t.poster_path,
    backdrop_path: t.backdrop_path,
    release_date: t.first_air_date ?? "",
    vote_average: t.vote_average,
    vote_count: t.vote_count,
    popularity: t.popularity,
    original_language: t.original_language,
    adult: t.adult ?? false,
    genres: t.genres,
    runtime: t.episode_run_time?.[0] ?? t.last_episode_to_air?.runtime ?? null,
    tagline: t.tagline,
    status: t.status,
    budget: 0,
    revenue: 0,
    homepage: t.homepage,
    imdb_id: t.external_ids?.imdb_id ?? null,
    production_countries: t.production_countries ?? [],
    spoken_languages: t.spoken_languages ?? [],
    production_companies: t.production_companies ?? [],
    origin_country: t.origin_country,
    credits: { cast, crew },
    videos: t.videos ?? { results: [] },
    images: t.images ?? { backdrops: [], posters: [], logos: [] },
    // content ratings → release_dates shape (type 6 = TV) to reuse the age-rating logic
    release_dates: {
      results: (t.content_ratings?.results ?? []).map((r) => ({
        iso_3166_1: r.iso_3166_1,
        release_dates: [
          {
            certification: r.rating,
            release_date: t.first_air_date ?? "",
            type: 6 as const,
            note: "",
          },
        ],
      })),
    },
    keywords: { keywords: t.keywords?.results ?? [] },
    external_ids: t.external_ids ?? {},
    belongs_to_collection: null,
    similar: normalizeTvPage(
      t.similar ?? { page: 1, results: [], total_pages: 0, total_results: 0 },
    ),
    recommendations: normalizeTvPage(
      t.recommendations ?? { page: 1, results: [], total_pages: 0, total_results: 0 },
    ),
    "watch/providers": t["watch/providers"] ?? { results: {} },
    media_type: "tv",
    tv: {
      status: t.status,
      type: t.type,
      in_production: t.in_production,
      first_air_date: t.first_air_date ?? "",
      last_air_date: t.last_air_date,
      number_of_seasons: t.number_of_seasons,
      number_of_episodes: t.number_of_episodes,
      episode_run_time: t.episode_run_time ?? [],
      // move "Specials" (season 0) to the end
      seasons: [...(t.seasons ?? [])].sort(
        (a, b) => (a.season_number || 999) - (b.season_number || 999),
      ),
      networks: t.networks ?? [],
      created_by: t.created_by ?? [],
      last_episode_to_air: t.last_episode_to_air,
      next_episode_to_air: t.next_episode_to_air,
    },
  };
}

/** Series that is still airing (new episodes coming) */
export const isAiring = (tv: {
  status: string;
  in_production: boolean;
  next_episode_to_air: Episode | null;
}) => !!tv.next_episode_to_air || (tv.status === "Returning Series" && tv.in_production);
