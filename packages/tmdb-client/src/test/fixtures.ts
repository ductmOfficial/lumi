/** Sample data for unit tests (not used by the app). */
import type { RawTvDetail } from "../tv.js";

export const ep = (season: number, n: number, air: string | null) => ({
  id: season * 100 + n,
  name: `E${n}`,
  overview: "",
  air_date: air,
  episode_number: n,
  season_number: season,
  still_path: null,
  vote_average: 8,
  vote_count: 10,
  runtime: 50,
});

export function makeRawTv(overrides: Partial<RawTvDetail> = {}): RawTvDetail {
  return {
    id: 1399,
    name: "Game of Thrones",
    original_name: "Game of Thrones",
    overview: "Seven kingdoms",
    poster_path: "/p.jpg",
    backdrop_path: "/b.jpg",
    first_air_date: "2011-04-17",
    vote_average: 8.4,
    vote_count: 20000,
    popularity: 300,
    original_language: "en",
    origin_country: ["US"],
    genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }],
    tagline: "Winter is coming",
    status: "Ended",
    type: "Scripted",
    homepage: null,
    in_production: false,
    last_air_date: "2019-05-19",
    number_of_seasons: 2,
    number_of_episodes: 20,
    episode_run_time: [60],
    seasons: [
      {
        id: 3,
        name: "Specials",
        overview: "",
        air_date: "2010-12-05",
        episode_count: 5,
        poster_path: null,
        season_number: 0,
        vote_average: 0,
      },
      {
        id: 2,
        name: "Season 2",
        overview: "",
        air_date: "2012-04-01",
        episode_count: 10,
        poster_path: null,
        season_number: 2,
        vote_average: 8,
      },
      {
        id: 1,
        name: "Season 1",
        overview: "",
        air_date: "2011-04-17",
        episode_count: 10,
        poster_path: null,
        season_number: 1,
        vote_average: 8.3,
      },
    ],
    networks: [{ id: 49, name: "HBO", logo_path: "/hbo.png", origin_country: "US" }],
    created_by: [{ id: 9813, name: "David Benioff", profile_path: null }],
    last_episode_to_air: ep(2, 10, "2012-06-03"),
    next_episode_to_air: null,
    production_countries: [],
    spoken_languages: [],
    production_companies: [],
    aggregate_credits: {
      cast: [
        {
          id: 22970,
          name: "Peter Dinklage",
          profile_path: null,
          order: 0,
          total_episode_count: 67,
          roles: [{ credit_id: "c1", character: "Tyrion", episode_count: 67 }],
        },
      ],
      crew: [
        {
          id: 5,
          name: "Ramin Djawadi",
          profile_path: null,
          department: "Sound",
          total_episode_count: 73,
          jobs: [{ credit_id: "j1", job: "Original Music Composer", episode_count: 73 }],
        },
      ],
    },
    videos: { results: [] },
    images: { backdrops: [], posters: [], logos: [] },
    content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-MA" }] },
    keywords: { results: [{ id: 1, name: "dragon" }] },
    external_ids: { imdb_id: "tt0944947" },
    similar: { page: 1, results: [], total_pages: 0, total_results: 0 },
    recommendations: {
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [
        {
          id: 1100,
          name: "House of the Dragon",
          original_name: "House of the Dragon",
          overview: "",
          poster_path: null,
          backdrop_path: null,
          first_air_date: "2022-08-21",
          vote_average: 8.4,
          vote_count: 1,
          popularity: 1,
          genre_ids: [10765],
          original_language: "en",
        },
      ],
    },
    "watch/providers": { results: {} },
    ...overrides,
  };
}

/** A copy of `obj` without `keys`, typed as the original (for optional fields). */
export function without<T extends object>(obj: T, keys: readonly (keyof T)[]): T {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as keyof T))) as T;
}
