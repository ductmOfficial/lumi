import { describe, expect, it } from "vitest";
import type { MovieSummary } from "@/lib/tmdb";
import { buildRounds, hashString, resultGrid, seededRandom } from "./game";

const pool = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  title: `Phim ${i + 1}`,
  poster_path: `/p${i}.jpg`,
  backdrop_path: `/b${i}.jpg`,
  release_date: `${1990 + i}-05-01`,
  vote_average: 7,
  genre_ids: [],
  overview: "",
})) as unknown as MovieSummary[];

describe("mini-game", () => {
  it("same seed → same question set (daily challenge)", () => {
    const a = buildRounds(pool, ["image", "year", "image"], seededRandom(hashString("2026-11-08")));
    const b = buildRounds(pool, ["image", "year", "image"], seededRandom(hashString("2026-11-08")));
    expect(a.map((r) => r.movie.id)).toEqual(b.map((r) => r.movie.id));
    expect(a.map((r) => r.options)).toEqual(b.map((r) => r.options));
  });
  it("each question has 4 distinct options including the answer", () => {
    const rounds = buildRounds(pool, ["image", "year", "image", "year"], seededRandom(42));
    for (const r of rounds) {
      expect(new Set(r.options).size).toBe(4);
      expect(r.options).toContain(r.answer);
    }
  });
  it("result grid", () => {
    expect(
      resultGrid([
        { points: 3, max: 3 },
        { points: 1, max: 3 },
        { points: 0, max: 2 },
      ]),
    ).toBe("🟩🟨⬛");
  });
});
