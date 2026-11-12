import { describe, expect, it } from "vitest";
import type { WatchedEntry } from "@/features/library/store";
import { computeBadges, computeWrapped } from "./badges";

const w = (id: number, genre: number, year: string, at: string, rating?: number): WatchedEntry => ({
  movie: {
    id,
    title: `M${id}`,
    poster_path: null,
    backdrop_path: null,
    release_date: `${year}-01-01`,
    vote_average: 7,
    genre_ids: [genre],
  },
  at: Date.parse(at),
  rating,
});

const game = { lastDay: null, streak: 0, bestStreak: 0, daily: {}, bestFree: 0, played: 0 };

describe("badges & wrapped", () => {
  it("earned / not earned badges; progress never exceeds the goal", () => {
    const watched = Array.from({ length: 12 }, (_, i) =>
      w(i, 27, String(1970 + i * 5), "2026-03-01"),
    );
    const b = computeBadges({ watched, progress: [], lists: [], game });
    const get = (id: string) => {
      const badge = b.find((x) => x.id === id);
      if (!badge) throw new Error(`no badge ${id}`);
      return badge;
    };
    expect(get("first").earned).toBe(true);
    expect(get("horror")).toMatchObject({ earned: true, current: 10, target: 10 });
    expect(get("decades").earned).toBe(true);
    expect(get("cinephile").earned).toBe(false);
  });
  it("wrapped only counts the selected year", () => {
    const watched = [
      w(1, 18, "1994", "2026-02-10", 9),
      w(2, 18, "2001", "2026-02-20", 7),
      w(3, 35, "2010", "2025-12-30", 10),
    ];
    const r = computeWrapped(watched, [], 2026);
    expect(r.movies).toBe(2);
    expect(r.avgRating).toBe(8);
    expect(r.topGenres[0]).toEqual({ id: 18, count: 2 });
    expect(r.favorite?.movie.id).toBe(1);
    expect(r.busiestMonth).toBe(1);
  });
});
