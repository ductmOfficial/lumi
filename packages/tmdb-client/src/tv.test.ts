import { describe, expect, it } from "vitest";

import { ep, makeRawTv, without } from "./test/fixtures.js";
import { isAiring, normalizeTvDetail, normalizeTvPage, normalizeTvSummary } from "./tv.js";

describe("normalizeTvDetail", () => {
  const tv = normalizeTvDetail(makeRawTv());

  it("maps a series to the movie shape + media_type tv", () => {
    expect(tv).toMatchObject({
      title: "Game of Thrones",
      release_date: "2011-04-17",
      runtime: 60,
      media_type: "tv",
      imdb_id: "tt0944947",
    });
    expect(tv.keywords.keywords[0]?.name).toBe("dragon");
    expect(tv.recommendations.results[0]).toMatchObject({
      title: "House of the Dragon",
      media_type: "tv",
    });
  });

  it("aggregate_credits → cast/crew, creators lead the crew", () => {
    expect(tv.credits.cast[0]).toMatchObject({
      name: "Peter Dinklage",
      character: "Tyrion",
      credit_id: "c1",
    });
    expect(tv.credits.crew[0]).toMatchObject({ name: "David Benioff", job: "Creator" });
  });

  it("content ratings become age labels; Specials season moves last", () => {
    expect(tv.release_dates.results[0]?.release_dates[0]).toMatchObject({
      certification: "TV-MA",
      type: 6,
    });
    expect(tv.tv?.seasons.map((s) => s.season_number)).toEqual([1, 2, 0]);
  });

  it("isAiring from the next episode / status", () => {
    const info = tv.tv;
    expect(info).toBeDefined();
    if (!info) return;
    expect(isAiring(info)).toBe(false);
    expect(isAiring({ ...info, next_episode_to_air: ep(3, 1, "2030-01-01") })).toBe(true);
    expect(isAiring({ ...info, status: "Returning Series", in_production: true })).toBe(true);
  });
});

describe("normalizeTvDetail with missing data", () => {
  it("fills empty lists and defaults when TMDB omits the appended responses", () => {
    const bare = without(makeRawTv({ last_episode_to_air: ep(1, 10, "2011-06-19") }), [
      "aggregate_credits",
      "created_by",
      "videos",
      "images",
      "content_ratings",
      "keywords",
      "external_ids",
      "similar",
      "recommendations",
      "watch/providers",
      "seasons",
      "networks",
      "episode_run_time",
      "production_countries",
      "spoken_languages",
      "production_companies",
      "first_air_date",
    ]);
    const tv = normalizeTvDetail(bare);

    expect(tv).toMatchObject({ release_date: "", runtime: 50, imdb_id: null, adult: false });
    expect(tv.credits).toEqual({ cast: [], crew: [] });
    expect(tv.similar.results).toEqual([]);
    expect(tv.release_dates.results).toEqual([]);
    expect(tv.tv).toMatchObject({ seasons: [], networks: [], episode_run_time: [] });
  });

  it("falls back to generated credit ids when roles and jobs are empty", () => {
    const tv = normalizeTvDetail(
      makeRawTv({
        created_by: [],
        aggregate_credits: {
          cast: [
            { id: 7, name: "A", profile_path: null, order: 0, total_episode_count: 1, roles: [] },
          ],
          crew: [
            {
              id: 8,
              name: "B",
              profile_path: null,
              department: "Sound",
              total_episode_count: 1,
              jobs: [],
            },
          ],
        },
      }),
    );
    expect(tv.credits.cast[0]?.credit_id).toBe("cast-7");
    expect(tv.credits.crew[0]?.credit_id).toBe("crew-8");
  });
});

describe("normalizeTvSummary", () => {
  const raw = {
    id: 5,
    name: "Mai",
    original_name: "Mai",
    overview: "",
    poster_path: null,
    backdrop_path: null,
    vote_average: 0,
    vote_count: 0,
    popularity: 0,
    genre_ids: [],
    original_language: "vi",
  };

  it("fills the movie fields and marks the media type", () => {
    expect(normalizeTvSummary(raw)).toMatchObject({
      title: "Mai",
      release_date: "",
      adult: false,
      media_type: "tv",
    });
  });

  it("defaults missing genres", () => {
    expect(normalizeTvSummary(without(raw, ["genre_ids"])).genre_ids).toEqual([]);
  });

  it("normalizes every result of a page", () => {
    const page = normalizeTvPage({ page: 1, results: [raw], total_pages: 1, total_results: 1 });
    expect(page.results[0]?.media_type).toBe("tv");
    expect(page.total_results).toBe(1);
  });
});
