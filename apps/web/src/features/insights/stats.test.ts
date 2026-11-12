import { describe, expect, it } from "vitest";
import type { MovieSummary } from "@/lib/tmdb";
import { activityByDay, affinityTop, decadeStats, genreBreakdown, recentShare } from "./stats";

const m = (
  id: number,
  genre_ids: number[],
  release_date: string,
  vote_average = 7,
  tv = false,
): MovieSummary => ({
  id,
  title: "",
  original_title: "",
  overview: "",
  poster_path: null,
  backdrop_path: null,
  release_date,
  vote_average,
  vote_count: 1,
  popularity: 1,
  genre_ids,
  original_language: "en",
  adult: false,
  ...(tv ? { media_type: "tv" as const } : {}),
});

describe("genreBreakdown", () => {
  it("splits movies / series and maps TV genres to movie genres", () => {
    const rows = genreBreakdown([
      m(1, [28], "2020-01-01"),
      m(2, [10759], "2020-01-01", 7, true),
      m(3, [18], "2020-01-01"),
    ]);
    expect(rows[0]).toEqual({ genreId: 28, movie: 1, tv: 1, total: 2 });
    expect(rows.find((r) => r.genreId === 12)).toEqual({ genreId: 12, movie: 0, tv: 1, total: 1 });
  });
});

describe("decadeStats", () => {
  it("groups by decade, averages ratings and drops undated items", () => {
    const rows = decadeStats([
      m(1, [], "1994-01-01", 9),
      m(2, [], "1999-05-01", 7),
      m(3, [], "2010-01-01", 6),
      m(4, [], ""),
    ]);
    expect(rows).toEqual([
      { decade: 1990, count: 2, avgRating: 8 },
      { decade: 2010, count: 1, avgRating: 6 },
    ]);
  });
});

describe("recentShare", () => {
  it("% released in the last 90 days (future excluded)", () => {
    const now = new Date("2026-11-07");
    expect(
      recentShare(
        [
          m(1, [], "2026-10-01"),
          m(2, [], "2020-01-01"),
          m(3, [], "2027-01-01"),
          m(4, [], "2026-09-01"),
        ],
        now,
      ),
    ).toBe(50);
  });
});

describe("activityByDay", () => {
  it("covers every day, counts by kind and skips onboarding", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    const at = (d: string) => new Date(d).getTime();
    const days = activityByDay(
      [
        { type: "view", genreIds: [], at: at("2026-11-07T08:00:00Z") },
        { type: "like", genreIds: [], at: at("2026-11-07T09:00:00Z") },
        { type: "onboard", genreIds: [], at: at("2026-11-07T09:00:00Z") },
        { type: "view", genreIds: [], at: at("2026-01-01T09:00:00Z") },
      ],
      now,
      7,
    );
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toEqual({ date: "2026-11-07", total: 2, byType: { view: 1, like: 1 } });
    expect(days.reduce((a, d) => a + d.total, 0)).toBe(2);
  });
});

describe("affinityTop", () => {
  it("normalizes to 0–100 and drops negative scores", () => {
    expect(
      affinityTop(
        new Map([
          [28, 8],
          [18, 4],
          [27, -3],
        ]),
      ),
    ).toEqual([
      { genreId: 28, score: 100 },
      { genreId: 18, score: 50 },
    ]);
  });
});
