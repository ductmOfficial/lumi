import { describe, expect, it } from "vitest";
import { nextUnseen, type ShowStatus } from "./api";
import { previousDay } from "./store";

const status: ShowStatus = {
  seasons: [
    { season_number: 0, episode_count: 3 },
    { season_number: 1, episode_count: 3 },
    { season_number: 2, episode_count: 4 },
  ],
  last: { season_number: 2, episode_number: 2, air_date: "2026-11-01" },
  next: { season_number: 2, episode_number: 3, air_date: "2026-11-15" },
};

describe("nextUnseen", () => {
  it("skips specials and returns the first unwatched episode", () => {
    expect(nextUnseen(status, new Set(["1-1", "1-2"]))).toEqual({ season: 1, episode: 3 });
  });
  it("ignores episodes that have not aired", () => {
    expect(nextUnseen(status, new Set(["1-1", "1-2", "1-3", "2-1", "2-2"]))).toBeNull();
  });
  it("finds the right gap when episodes were watched out of order", () => {
    expect(nextUnseen(status, new Set(["1-1", "1-3", "2-1"]))).toEqual({ season: 1, episode: 2 });
  });
});

describe("previousDay", () => {
  it("crosses month/year boundaries", () => {
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
  });
});
