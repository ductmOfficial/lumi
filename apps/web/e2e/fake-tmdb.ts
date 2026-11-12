/**
 * A small, deterministic stand-in for the TMDB API, so the browser tests need no token or network.
 * Every title, person and service here is fictional. Images are generated SVG placeholders.
 */
import type {
  Genre,
  MovieDetail,
  MovieSummary,
  Paginated,
  PersonDetail,
  RawTvDetail,
  RawTvSummary,
  SeasonDetail,
  WatchProvider,
} from "@lumi/tmdb-client";

const WORDS_A = ["Moonlit", "Silent", "Paper", "Velvet", "Hidden", "Northern", "Golden", "Last"];
const WORDS_B = ["Harbor", "Orchard", "Signal", "Lantern", "Meridian", "Garden", "Tide", "Atlas"];
const FIRST = ["Mai", "Linh", "An", "Bao", "Nora", "Elio", "Ivo", "Sana"];
const LAST = ["Tran", "Vale", "Hart", "Okoye", "Lund", "Pham", "Reyes", "Moreau"];

export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 878, name: "Science Fiction" },
];
export const TV_GENRES: Genre[] = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
];

/** Fictional services: the tests pick "Lantern+" as the streaming service. */
export const PROVIDERS: WatchProvider[] = [
  {
    provider_id: 9001,
    provider_name: "Lantern+",
    logo_path: "/logo-9001.svg",
    display_priority: 1,
  },
  {
    provider_id: 9002,
    provider_name: "Orchard TV",
    logo_path: "/logo-9002.svg",
    display_priority: 2,
  },
];

const pick = <T>(list: readonly T[], n: number): T => list[n % list.length] as T;
export const titleFor = (id: number) => `${pick(WORDS_A, id)} ${pick(WORDS_B, Math.floor(id / 8))}`;
export const nameFor = (id: number) => `${pick(FIRST, id)} ${pick(LAST, Math.floor(id / 8))}`;

function date(id: number, offsetDays = 0) {
  const d = new Date(Date.UTC(2026, 0, 1) - (id % 3000) * 86_400_000 + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function movieSummary(id: number): MovieSummary {
  const title = titleFor(id);
  return {
    id,
    title,
    original_title: title,
    overview: `${title} follows a small crew through one long night in a city that never sleeps.`,
    poster_path: `/poster-${id}.svg`,
    backdrop_path: `/backdrop-${id}.svg`,
    release_date: date(id),
    vote_average: 6 + (id % 30) / 10,
    vote_count: 900 + id,
    popularity: 1000 - (id % 500),
    genre_ids: [pick(MOVIE_GENRES, id).id, pick(MOVIE_GENRES, id + 3).id],
    original_language: "en",
    adult: false,
  };
}

export function tvSummary(id: number): RawTvSummary {
  const name = titleFor(id + 3);
  return {
    id,
    name,
    original_name: name,
    overview: `${name} is a series about neighbours who share one courtyard and many secrets.`,
    poster_path: `/poster-tv-${id}.svg`,
    backdrop_path: `/backdrop-tv-${id}.svg`,
    first_air_date: date(id),
    vote_average: 7 + (id % 20) / 10,
    vote_count: 800 + id,
    popularity: 900 - (id % 400),
    genre_ids: [pick(TV_GENRES, id).id],
    original_language: "en",
    origin_country: ["US"],
  };
}

const page = <T>(results: T[], p = 1): Paginated<T> => ({
  page: p,
  results,
  total_pages: 3,
  total_results: results.length * 3,
});

const ids = (seed: number, p: number, n = 20) =>
  Array.from({ length: n }, (_, i) => 100 + ((seed * 37 + (p - 1) * n + i) % 400));

function hash(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}

const image = (file_path: string) => ({
  file_path,
  aspect_ratio: 1.78,
  width: 1280,
  height: 720,
  iso_639_1: null,
  vote_average: 5,
  vote_count: 10,
});

function cast(id: number) {
  return Array.from({ length: 6 }, (_, i) => ({
    id: 5000 + ((id + i) % 50),
    name: nameFor(id + i),
    character: `Role ${i + 1}`,
    profile_path: `/person-${5000 + ((id + i) % 50)}.svg`,
    order: i,
    credit_id: `c-${id}-${i}`,
  }));
}

function providersFor(id: number) {
  return {
    results: {
      VN: {
        link: "https://www.themoviedb.org/",
        flatrate: PROVIDERS.slice(id % 2, (id % 2) + 1),
      },
    },
  };
}

export function movieDetail(id: number): MovieDetail {
  const s = movieSummary(id);
  return {
    ...s,
    genres: [pick(MOVIE_GENRES, id), pick(MOVIE_GENRES, id + 3)],
    runtime: 95 + (id % 40),
    tagline: "Some doors only open once.",
    status: "Released",
    budget: 20_000_000,
    revenue: 85_000_000,
    homepage: null,
    imdb_id: null,
    production_countries: [{ iso_3166_1: "US", name: "United States of America" }],
    spoken_languages: [{ iso_639_1: "en", english_name: "English", name: "English" }],
    production_companies: [],
    credits: {
      cast: cast(id),
      crew: [
        {
          id: 6000 + (id % 20),
          name: nameFor(id + 40),
          job: "Director",
          department: "Directing",
          profile_path: null,
          credit_id: `d-${id}`,
        },
      ],
    },
    videos: { results: [] },
    similar: page(ids(id + 1, 1, 8).map(movieSummary)),
    recommendations: page(ids(id + 2, 1, 8).map(movieSummary)),
    "watch/providers": providersFor(id),
    images: {
      backdrops: [image(`/backdrop-${id}.svg`), image(`/still-${id}-a.svg`)],
      posters: [image(`/poster-${id}.svg`)],
      logos: [],
    },
    release_dates: {
      results: [
        {
          iso_3166_1: "VN",
          release_dates: [
            { certification: "T13", release_date: s.release_date, type: 3, note: "" },
          ],
        },
      ],
    },
    keywords: { keywords: [{ id: 77, name: "night city" }] },
    external_ids: {},
    belongs_to_collection: null,
  };
}

function tvDetail(id: number): RawTvDetail {
  const s = tvSummary(id);
  const episode = (season: number, n: number) => ({
    id: id * 1000 + season * 100 + n,
    name: `Episode ${n}`,
    overview: "A quiet evening turns into a long night.",
    air_date: date(id, season * 60 + n * 7),
    episode_number: n,
    season_number: season,
    still_path: null,
    vote_average: 7.5,
    vote_count: 40,
    runtime: 45,
  });
  return {
    ...s,
    genres: [pick(TV_GENRES, id)],
    tagline: "Everyone has a key.",
    status: "Ended",
    type: "Scripted",
    homepage: null,
    in_production: false,
    last_air_date: date(id, 200),
    number_of_seasons: 2,
    number_of_episodes: 16,
    episode_run_time: [45],
    seasons: [1, 2].map((n) => ({
      id: id * 10 + n,
      name: `Season ${n}`,
      overview: "",
      air_date: date(id, n * 60),
      episode_count: 8,
      poster_path: null,
      season_number: n,
      vote_average: 7.6,
    })),
    networks: [],
    created_by: [{ id: 7000 + (id % 10), name: nameFor(id + 60), profile_path: null }],
    last_episode_to_air: episode(2, 8),
    next_episode_to_air: null,
    aggregate_credits: {
      cast: cast(id).map((c) => ({
        id: c.id,
        name: c.name,
        profile_path: c.profile_path,
        order: c.order,
        total_episode_count: 16,
        roles: [{ credit_id: c.credit_id, character: c.character, episode_count: 16 }],
      })),
      crew: [],
    },
    videos: { results: [] },
    images: { backdrops: [image(`/backdrop-tv-${id}.svg`)], posters: [], logos: [] },
    content_ratings: { results: [{ iso_3166_1: "VN", rating: "T16" }] },
    keywords: { results: [] },
    external_ids: {},
    similar: page(ids(id + 4, 1, 8).map(tvSummary)),
    recommendations: page(ids(id + 5, 1, 8).map(tvSummary)),
    "watch/providers": providersFor(id),
  };
}

function season(tvId: number, n: number): SeasonDetail {
  return {
    id: tvId * 10 + n,
    name: `Season ${n}`,
    overview: "",
    air_date: date(tvId, n * 60),
    episode_count: 8,
    poster_path: null,
    season_number: n,
    vote_average: 7.6,
    episodes: Array.from({ length: 8 }, (_, i) => ({
      id: tvId * 1000 + n * 100 + i + 1,
      name: `Episode ${i + 1}`,
      overview: "A quiet evening turns into a long night.",
      air_date: date(tvId, n * 60 + (i + 1) * 7),
      episode_number: i + 1,
      season_number: n,
      still_path: null,
      vote_average: 7.5,
      vote_count: 40,
      runtime: 45,
    })),
  };
}

function person(id: number): Omit<PersonDetail, "movie_credits"> & {
  combined_credits: { cast: unknown[]; crew: unknown[] };
} {
  return {
    id,
    name: nameFor(id),
    biography: `${nameFor(id)} is an actor known for quiet, careful roles.`,
    birthday: "1985-04-12",
    deathday: null,
    place_of_birth: "Hue, Vietnam",
    profile_path: `/person-${id}.svg`,
    known_for_department: "Acting",
    also_known_as: [],
    gender: 1,
    popularity: 40,
    homepage: null,
    imdb_id: null,
    images: { profiles: [image(`/person-${id}.svg`)] },
    external_ids: {},
    combined_credits: {
      cast: ids(id, 1, 10).map((m, i) => ({
        ...movieSummary(m),
        media_type: "movie",
        character: `Role ${i + 1}`,
        credit_id: `pc-${id}-${m}`,
      })),
      crew: [],
    },
  };
}

const people = (seed: number) =>
  ids(seed, 1, 12).map((i) => ({
    id: 5000 + (i % 50),
    name: nameFor(i),
    profile_path: `/person-${5000 + (i % 50)}.svg`,
    known_for_department: "Acting",
    popularity: 30,
    known_for: [movieSummary(i)],
  }));

/** Answers one TMDB API path (without the /api/tmdb prefix); undefined = not found. */
export function fakeTmdb(path: string, params: URLSearchParams): unknown {
  const p = Number(params.get("page") ?? "1");
  let m: RegExpMatchArray | null;

  if ((m = /^\/genre\/(movie|tv)\/list$/.exec(path)))
    return { genres: m[1] === "tv" ? TV_GENRES : MOVIE_GENRES };
  if (/^\/watch\/providers\/(movie|tv)$/.test(path)) return { results: PROVIDERS };
  if (path === "/trending/person/week" || path === "/search/person")
    return page(people(hash(params.get("query") ?? path)));
  if (path === "/search/keyword") return page([{ id: 77, name: "night city" }]);
  if (path === "/trending/all/day" || path === "/trending/all/week")
    return page(
      ids(1, p).map((id, i) =>
        i % 3 === 2
          ? { ...tvSummary(id), media_type: "tv" }
          : { ...movieSummary(id), media_type: "movie" },
      ),
      p,
    );
  if (path === "/search/multi")
    return page(
      ids(hash(params.get("query") ?? ""), p, 10).map((id) => ({
        ...movieSummary(id),
        media_type: "movie",
      })),
    );
  if ((m = /^\/(movie|tv)\/(\d+)\/videos$/.exec(path))) return { id: Number(m[2]), results: [] };
  if (/^\/(movie|tv)\/\d+\/reviews$/.test(path)) return page([]);
  if ((m = /^\/tv\/(\d+)\/season\/(\d+)$/.exec(path))) return season(Number(m[1]), Number(m[2]));
  if ((m = /^\/movie\/(\d+)$/.exec(path))) return movieDetail(Number(m[1]));
  if ((m = /^\/tv\/(\d+)$/.exec(path))) return tvDetail(Number(m[1]));
  if ((m = /^\/person\/(\d+)$/.exec(path))) return person(Number(m[1]));
  if ((m = /^\/keyword\/(\d+)$/.exec(path))) return { id: Number(m[1]), name: "night city" };
  if ((m = /^\/collection\/(\d+)$/.exec(path)))
    return {
      id: Number(m[1]),
      name: "Harbor Collection",
      overview: "",
      poster_path: null,
      backdrop_path: null,
      parts: ids(3, 1, 3).map(movieSummary),
    };
  // every other list (trending, discover, search, popular, recommendations, ...)
  const isTv = /(^|\/)tv(\/|$)/.test(path);
  const seed = hash(path + (params.get("query") ?? "") + (params.get("with_genres") ?? ""));
  return page(
    ids(seed, p).map((id) => (isTv ? tvSummary(id) : movieSummary(id))),
    p,
  );
}

/** A flat-colour SVG standing in for posters, backdrops, portraits and logos. */
export function placeholderImage(path: string): string {
  const hue = hash(path) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="hsl(${hue} 45% 38%)"/><circle cx="250" cy="330" r="120" fill="hsl(${(hue + 40) % 360} 55% 60%)"/></svg>`;
}
