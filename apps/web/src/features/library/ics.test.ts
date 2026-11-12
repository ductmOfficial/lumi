import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("buildIcs", () => {
  it("creates all-day events ending the next day, with a reminder before", () => {
    const ics = buildIcs(
      [
        {
          date: "2026-12-31",
          movie: {
            id: 7,
            title: "A; B",
            poster_path: null,
            backdrop_path: null,
            release_date: "2026-12-31",
            vote_average: 0,
            genre_ids: [],
          },
        },
      ],
      "https://x.test",
      (r) => `Release: ${r.movie.title}`,
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
    expect(ics).toContain("SUMMARY:Release: A\\; B");
    expect(ics).toContain("URL:https://x.test/movie/7");
    expect(ics).toContain("BEGIN:VALARM");
  });
});
