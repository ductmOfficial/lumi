import { describe, expect, it } from "vitest";
import type { MovieDetail, Review, Video } from "@/lib/tmdb";
import { buildMovieTimeline, reviewerAvatar } from "./timeline";
import { normalizeTvDetail } from "@/lib/tmdb";
import { makeRawTv } from "@/test/fixtures";

const video = (id: string, type: string, published_at: string, site = "YouTube"): Video => ({
  id,
  key: id,
  name: id,
  site,
  type,
  official: true,
  iso_639_1: "en",
  published_at,
  size: 1080,
});
const img = (p: string) => ({
  file_path: p,
  aspect_ratio: 1.78,
  width: 1,
  height: 1,
  iso_639_1: null,
  vote_average: 0,
  vote_count: 0,
});

function makeMovie(overrides: Partial<MovieDetail> = {}): MovieDetail {
  return {
    id: 1,
    title: "Test",
    original_title: "Test",
    overview: "",
    poster_path: null,
    backdrop_path: null,
    release_date: "2026-03-01",
    vote_average: 7,
    vote_count: 100,
    popularity: 1,
    original_language: "en",
    adult: false,
    genres: [],
    runtime: 120,
    tagline: null,
    status: "Released",
    budget: 0,
    revenue: 0,
    homepage: null,
    imdb_id: null,
    production_countries: [{ iso_3166_1: "US", name: "United States" }],
    spoken_languages: [],
    credits: { cast: [], crew: [] },
    videos: {
      results: [
        video("a", "Trailer", "2025-12-01T00:00:00Z"),
        video("b", "Teaser", "2025-06-01T00:00:00Z"),
        video("c", "Trailer", "2025-07-01T00:00:00Z", "Vimeo"),
      ],
    },
    similar: { page: 1, results: [], total_pages: 0, total_results: 0 },
    recommendations: { page: 1, results: [], total_pages: 0, total_results: 0 },
    "watch/providers": { results: {} },
    images: { backdrops: [img("/1"), img("/2"), img("/3")], posters: [img("/p")], logos: [] },
    release_dates: {
      results: [
        {
          iso_3166_1: "US",
          release_dates: [
            {
              certification: "PG-13",
              release_date: "2026-02-20T00:00:00Z",
              type: 1,
              note: "Premiere",
            },
            { certification: "PG-13", release_date: "2026-03-01T00:00:00Z", type: 3, note: "" },
            { certification: "", release_date: "2026-03-02T00:00:00Z", type: 2, note: "" },
          ],
        },
        {
          iso_3166_1: "VN",
          release_dates: [
            { certification: "T13", release_date: "2026-03-07T00:00:00Z", type: 3, note: "" },
          ],
        },
        {
          iso_3166_1: "FR",
          release_dates: [
            { certification: "", release_date: "2026-03-05T00:00:00Z", type: 3, note: "" },
          ],
        },
      ],
    },
    keywords: { keywords: [{ id: 1, name: "space opera" }] },
    external_ids: {},
    belongs_to_collection: null,
    production_companies: [],
    ...overrides,
  };
}

const review: Review = {
  id: "r1",
  author: "bob",
  author_details: { name: "Bob", username: "bob", avatar_path: null, rating: 8 },
  content: "Great",
  created_at: "2026-03-10T00:00:00Z",
  updated_at: "2026-03-10T00:00:00Z",
  url: "https://x",
};

describe("buildMovieTimeline", () => {
  it("uses release dates for the region + production country, merging types 2/3", () => {
    const posts = buildMovieTimeline(makeMovie(), [], {
      region: "VN",
      now: new Date("2026-06-01"),
    });
    const releases = posts.filter((p) => p.kind === "release").map((p) => p.id);
    expect(releases.sort()).toEqual(["release-US-1", "release-US-3", "release-VN-3"]);
  });

  it("keeps YouTube videos only, newest first, and sorts everything by date descending", () => {
    const posts = buildMovieTimeline(makeMovie(), [review], {
      region: "VN",
      now: new Date("2026-06-01"),
    });
    const videos = posts.filter((p) => p.kind === "video").map((p) => p.id);
    expect(videos).toEqual(["video-a", "video-b"]);
    const dated = posts.filter((p) => p.kind !== "overview" && p.kind !== "tagline");
    const dates = dated.map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(dated[0]?.kind).toBe("review");
  });

  it("pins a countdown while the title is not yet released in the region", () => {
    const posts = buildMovieTimeline(makeMovie(), [], {
      region: "VN",
      now: new Date("2026-03-01T00:00:00Z"),
    });
    expect(posts[0]).toMatchObject({ kind: "countdown", days: 6 });
  });

  it("Overview post first, then the countdown, then the tagline; photos differ from the cover", () => {
    const movie = makeMovie({
      overview: "Story",
      tagline: "Fear is the mind-killer",
      backdrop_path: "/1",
    });
    const posts = buildMovieTimeline(movie, [review], {
      region: "VN",
      now: new Date("2026-03-01T00:00:00Z"),
    });
    expect(posts.slice(0, 3).map((p) => p.kind)).toEqual(["overview", "countdown", "tagline"]);
    expect(posts[0]).toMatchObject({ image: "/2" });
  });

  it("no countdown once released; drops the photo set with fewer than 3 images", () => {
    const posts = buildMovieTimeline(
      makeMovie({ images: { backdrops: [img("/1")], posters: [], logos: [] } }),
      [],
      {
        region: "VN",
        now: new Date("2026-06-01"),
      },
    );
    expect(posts.some((p) => p.kind === "countdown")).toBe(false);
    expect(posts.some((p) => p.kind === "photos")).toBe(false);
    expect(posts.some((p) => p.kind === "keywords")).toBe(true);
  });

  it("merges every image type into ONE photo-set post with per-type counts", () => {
    const movie = makeMovie({
      images: {
        backdrops: [img("/1"), img("/2"), img("/3")],
        posters: [img("/p1"), img("/p2")],
        logos: [img("/l1")],
      },
    });
    const photos = buildMovieTimeline(movie, [], {
      region: "VN",
      now: new Date("2026-06-01"),
    }).filter((p) => p.kind === "photos");
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({ counts: { backdrops: 3, posters: 2, logos: 1 }, total: 6 });
    const one = buildMovieTimeline(
      makeMovie({ images: { backdrops: [], posters: [img("/p1")], logos: [img("/l")] } }),
      [],
      { region: "VN", now: new Date("2026-06-01") },
    );
    expect(one.some((p) => p.kind === "photos")).toBe(false);
  });
});

describe("reviewerAvatar", () => {
  it("handles absolute URLs with an extra leading slash", () => {
    expect(reviewerAvatar("/https://gravatar.com/a.png")).toBe("https://gravatar.com/a.png");
    expect(reviewerAvatar("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w92/abc.jpg");
    expect(reviewerAvatar(null)).toBeUndefined();
  });
});

describe("timeline series", () => {
  it("pins the next episode right after Overview; has the latest episode and seasons", () => {
    const tv = normalizeTvDetail(
      makeRawTv({
        status: "Returning Series",
        next_episode_to_air: {
          id: 9,
          name: "Next",
          overview: "",
          air_date: "2026-11-20",
          episode_number: 1,
          season_number: 3,
          still_path: null,
          vote_average: 0,
          vote_count: 0,
          runtime: null,
        },
      }),
    );
    const posts = buildMovieTimeline(tv, [], { region: "VN", now: new Date("2026-11-10") });
    expect(posts.slice(0, 3).map((p) => p.id)).toEqual(["overview", "episode-next", "tagline"]);
    expect(posts.find((p) => p.id === "episode-next")).toMatchObject({ days: 10 });
    expect(posts.some((p) => p.id === "episode-last")).toBe(true);
    // season 0 (Specials) is not a post; season 1 is the "premiere"
    expect(
      posts
        .filter((p) => p.kind === "season")
        .map((p) => p.id)
        .sort(),
    ).toEqual(["season-1", "season-2"]);
    expect(posts.find((p) => p.id === "season-1")).toMatchObject({ isFirst: true });
    expect(posts.some((p) => p.kind === "ended")).toBe(false);
  });

  it('an ended series gets a "series finale" post', () => {
    const posts = buildMovieTimeline(normalizeTvDetail(makeRawTv()), [], {
      region: "VN",
      now: new Date("2026-11-10"),
    });
    expect(posts.find((p) => p.kind === "ended")).toMatchObject({ seasons: 2, episodes: 20 });
  });
});
