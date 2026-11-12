export interface Paginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface MovieSummary {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  adult: boolean;
  /** 'tv' for series (normalized to the movie shape); absent = movie */
  media_type?: MediaType;
}

export type MediaType = "movie" | "tv";

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  credit_id: string;
  known_for_department?: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  credit_id: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1: string;
  published_at: string;
  size: number;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface WatchProvidersByRegion {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  free?: WatchProvider[];
  ads?: WatchProvider[];
}

export interface MovieDetail extends Omit<MovieSummary, "genre_ids"> {
  genres: Genre[];
  runtime: number | null;
  tagline: string | null;
  status: string;
  budget: number;
  revenue: number;
  homepage: string | null;
  imdb_id: string | null;
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; english_name: string; name: string }[];
  credits: { cast: CastMember[]; crew: CrewMember[] };
  videos: { results: Video[] };
  similar: Paginated<MovieSummary>;
  recommendations: Paginated<MovieSummary>;
  "watch/providers": { results: Record<string, WatchProvidersByRegion> };
  images: ImageSet;
  release_dates: { results: { iso_3166_1: string; release_dates: ReleaseDate[] }[] };
  keywords: { keywords: Keyword[] };
  external_ids: ExternalIds;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];
  origin_country?: string[];
  media_type?: MediaType;
  /** series only */
  tv?: TvExtra;
}

export interface ImageItem {
  file_path: string;
  aspect_ratio: number;
  width: number;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
}

export interface ImageSet {
  backdrops: ImageItem[];
  posters: ImageItem[];
  logos: ImageItem[];
}

/** type: 1 Premiere, 2 Theatrical (limited), 3 Theatrical, 4 Digital, 5 Physical, 6 TV */
export interface ReleaseDate {
  certification: string;
  release_date: string;
  type: 1 | 2 | 3 | 4 | 5 | 6;
  note: string;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface ExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  tiktok_id?: string | null;
  youtube_id?: string | null;
  wikidata_id?: string | null;
}

export interface Review {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface Collection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: MovieSummary[];
}

export interface PersonMovieCast extends MovieSummary {
  character: string;
  credit_id: string;
}

export interface PersonMovieCrew extends MovieSummary {
  job: string;
  department: string;
  credit_id: string;
}

export interface PersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  also_known_as: string[];
  gender: number;
  popularity: number;
  homepage: string | null;
  imdb_id: string | null;
  movie_credits: { cast: PersonMovieCast[]; crew: PersonMovieCrew[] };
  images: { profiles: ImageItem[] };
  external_ids: ExternalIds;
}

export interface TmdbErrorBody {
  status_code?: number;
  status_message?: string;
  success?: boolean;
}

// ------------------------------------------------------------------ TV

export interface Episode {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  episode_type?: string;
}

export interface SeasonSummary {
  id: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_count: number;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
}

export interface SeasonDetail extends SeasonSummary {
  episodes: (Episode & {
    guest_stars?: { id: number; name: string; character: string; profile_path: string | null }[];
  })[];
}

export interface Network {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

/** Series-specific part, attached to the normalized MovieDetail (movie.tv). */
export interface TvExtra {
  status: string;
  type: string;
  in_production: boolean;
  first_air_date: string;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  seasons: SeasonSummary[];
  networks: Network[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  last_episode_to_air: Episode | null;
  next_episode_to_air: Episode | null;
}

/** Raw TMDB series data — internal to lib/tmdb/tv.ts */
export interface RawTvSummary {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  original_language: string;
  origin_country?: string[];
  adult?: boolean;
}
