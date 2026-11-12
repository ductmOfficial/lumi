import { describe, expect, it } from "vitest";
import type { MovieSummary, PersonDetail } from "@/lib/tmdb";
import { buildLifeEvents, mergeCredits } from "./credits";

const m = (id: number, release_date: string, vote_count = 10): MovieSummary => ({
  id,
  title: `M${id}`,
  original_title: "",
  overview: "",
  poster_path: null,
  backdrop_path: null,
  release_date,
  vote_average: 7,
  vote_count,
  popularity: vote_count,
  genre_ids: [],
  original_language: "en",
  adult: false,
});

const person: PersonDetail = {
  id: 1,
  name: "A",
  biography: "",
  birthday: "1980-05-10",
  deathday: null,
  place_of_birth: "Hanoi",
  profile_path: null,
  known_for_department: "Acting",
  also_known_as: [],
  gender: 1,
  popularity: 1,
  homepage: null,
  imdb_id: null,
  movie_credits: {
    cast: [
      { ...m(1, "2001-01-01"), character: "Kid", credit_id: "a" },
      { ...m(2, "2010-06-01", 9000), character: "Hero", credit_id: "b" },
      { ...m(3, "2010-09-01", 200), character: "Villain", credit_id: "c" },
      { ...m(4, "2027-12-01"), character: "Lead", credit_id: "d" },
      { ...m(5, ""), character: "Unknown", credit_id: "e" },
    ],
    crew: [
      { ...m(2, "2010-06-01", 9000), job: "Producer", department: "Production", credit_id: "f" },
    ],
  },
  images: { profiles: [] },
  external_ids: {},
};

describe("mergeCredits", () => {
  it("merges acting and crew roles for the same title", () => {
    const c = mergeCredits(person).find((x) => x.movie.id === 2);
    expect(c?.roles).toEqual(["Hero", "Producer"]);
    expect(c?.isCast).toBe(true);
  });
});

describe("buildLifeEvents", () => {
  const events = buildLifeEvents(person, new Date("2026-11-07"));

  it("pins upcoming projects first and the birthday last", () => {
    expect(events[0]).toMatchObject({ kind: "upcoming" });
    expect(events.at(-1)).toMatchObject({ kind: "birth", place: "Hanoi" });
  });

  it("finds the first role and the best-known work", () => {
    expect(events.find((e) => e.kind === "debut")).toMatchObject({ credit: { movie: { id: 1 } } });
    expect(events.find((e) => e.kind === "breakout")).toMatchObject({
      credit: { movie: { id: 2 } },
    });
  });

  it("groups by year and drops titles without a date", () => {
    const y2010 = events.find((e) => e.kind === "year" && e.year === 2010);
    expect(y2010?.kind === "year" && y2010.credits.map((c) => c.movie.id)).toEqual([2, 3]);
    expect(events.some((e) => e.kind === "year" && e.credits.some((c) => c.movie.id === 5))).toBe(
      false,
    );
  });
});
