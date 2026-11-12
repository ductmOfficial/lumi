import { describe, expect, it } from "vitest";
import {
  assignLayouts,
  buildRows,
  genreAffinity,
  GENRE,
  HALF_LIFE_DAYS,
  MAX_SPOTLIGHTS,
  matchPercent,
  pickSeeds,
  type ProfileInput,
  type RowSpec,
} from "./engine";
import type { MovieLite, SignalEvent } from "./types";

const DAY = 86_400_000;
const NOW = new Date("2026-11-04T14:00:00"); // Wednesday, November
const ALL_GENRES = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37,
];

const movie = (id: number, genre_ids: number[]): MovieLite => ({
  id,
  title: `M${id}`,
  poster_path: null,
  backdrop_path: null,
  release_date: "2020-01-01",
  vote_average: 7,
  genre_ids,
});
const ev = (
  type: SignalEvent["type"],
  genreIds: number[],
  daysAgo = 0,
  movieId?: number,
): SignalEvent => ({
  type,
  genreIds,
  movieId,
  at: NOW.getTime() - daysAgo * DAY,
});
const empty: ProfileInput = { events: [], history: [], watchlist: [], reactions: {} };

describe("genreAffinity", () => {
  it("adds weights by signal type", () => {
    const aff = genreAffinity([ev("like", [28]), ev("view", [28, 878])], NOW.getTime());
    expect(aff.get(28)).toBeCloseTo(5);
    expect(aff.get(878)).toBeCloseTo(1);
  });
  it("halves after each half-life", () => {
    const aff = genreAffinity([ev("like", [28], HALF_LIFE_DAYS)], NOW.getTime());
    expect(aff.get(28)).toBeCloseTo(2);
  });
  it("dislike produces a negative score", () => {
    const aff = genreAffinity([ev("dislike", [27])], NOW.getTime());
    expect(aff.get(27)).toBeLessThan(0);
  });
});

describe("canonicalGenres (TV → phim)", () => {
  it("TV Action & Adventure scores both Action and Adventure", () => {
    const aff = genreAffinity([ev("like", [10759])], NOW.getTime());
    expect(aff.get(28)).toBeCloseTo(4);
    expect(aff.get(12)).toBeCloseTo(4);
    expect(aff.has(10759)).toBe(false);
  });
  it("a Sci-Fi & Fantasy series matches a science-fiction taste", () => {
    const aff = genreAffinity([ev("like", [878]), ev("view", [35])], NOW.getTime());
    expect(matchPercent([10765], aff)).toBeGreaterThan(matchPercent([35], aff) ?? 100);
  });
});

describe("matchPercent", () => {
  it("null without data", () => {
    expect(matchPercent([28], new Map())).toBeNull();
  });
  it("favorite genres score higher, within 55–98", () => {
    const aff = genreAffinity(
      [ev("like", [28]), ev("like", [28]), ev("view", [35])],
      NOW.getTime(),
    );
    const action = matchPercent([28], aff) ?? 0;
    const comedy = matchPercent([35], aff) ?? 0;
    const horror = matchPercent([27], aff) ?? 0;
    expect(action).toBeGreaterThan(comedy);
    expect(comedy).toBeGreaterThan(horror);
    for (const v of [action, comedy, horror]) {
      expect(v).toBeGreaterThanOrEqual(55);
      expect(v).toBeLessThanOrEqual(98);
    }
  });
});

describe("pickSeeds", () => {
  it("favors liked titles and drops disliked ones", () => {
    const input: ProfileInput = {
      ...empty,
      history: [
        { movie: movie(1, [28]), at: NOW.getTime() },
        { movie: movie(3, [27]), at: NOW.getTime() },
      ],
      reactions: {
        "movie-2": { reaction: "like", movie: movie(2, [878]), at: NOW.getTime() - DAY },
        "movie-3": { reaction: "dislike", movie: movie(3, [27]), at: NOW.getTime() },
      },
    };
    const seeds = pickSeeds(input, NOW.getTime(), 3);
    expect(seeds.map((s) => s.movie.id)).toEqual([2, 1]);
    // a series sharing an id with a movie is not merged by mistake
    const tv = { ...movie(2, [18]), media_type: "tv" as const };
    const both = pickSeeds(
      { ...input, watchlist: [{ movie: tv, at: NOW.getTime() }] },
      NOW.getTime(),
      5,
    );
    expect(both.filter((s) => s.movie.id === 2)).toHaveLength(2);
    expect(seeds[0]?.reason).toBe("like");
  });
});

describe("buildRows", () => {
  it("new user: Top 10 first, no personal rows", () => {
    const rows = buildRows(empty, { now: NOW, allGenreIds: ALL_GENRES });
    expect(rows[0]?.kind).toBe("top10");
    expect(
      rows.some((r) => r.kind === "genre" || r.kind === "because" || r.kind === "explore"),
    ).toBe(false);
    expect(rows.some((r) => r.kind === "list" && r.category === "popular")).toBe(true);
  });

  it('with a profile: builds "Because you…" and favorite-genre rows', () => {
    const input: ProfileInput = {
      ...empty,
      events: [ev("like", [GENRE.scifi], 1, 10), ev("view", [GENRE.action], 0, 11)],
      history: [{ movie: movie(11, [GENRE.action]), at: NOW.getTime() }],
      reactions: {
        "movie-10": { reaction: "like", movie: movie(10, [GENRE.scifi]), at: NOW.getTime() - DAY },
      },
    };
    const rows = buildRows(input, { now: NOW, allGenreIds: ALL_GENRES });
    expect(rows.find((r) => r.kind === "because")).toMatchObject({
      movie: { id: 10 },
      reason: "like",
    });
    const genreRows = rows.flatMap((r) => (r.kind === "genre" ? [r.genreId] : []));
    expect(genreRows[0]).toBe(GENRE.scifi);
    expect(rows.some((r) => r.kind === "explore")).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(15);
    expect(rows.some((r) => r.kind === "tv")).toBe(true);
  });

  it("row ids are unique and results are stable within a day", () => {
    const input: ProfileInput = { ...empty, events: [ev("like", [GENRE.drama])] };
    const a = buildRows(input, { now: NOW, allGenreIds: ALL_GENRES });
    const b = buildRows(input, { now: new Date("2026-11-04T20:00:00"), allGenreIds: ALL_GENRES });
    expect(new Set(a.map((r) => r.id)).size).toBe(a.length);
    expect(a.find((r) => r.kind === "explore")).toEqual(b.find((r) => r.kind === "explore"));
  });

  it("seasonal: Halloween in October, Vietnamese & family titles in January", () => {
    const oct = buildRows(empty, { now: new Date("2026-10-20T10:00:00"), allGenreIds: ALL_GENRES });
    expect(oct.some((r) => r.kind === "context" && r.context === "halloween")).toBe(true);
    const jan = buildRows(empty, { now: new Date("2027-01-25T10:00:00"), allGenreIds: ALL_GENRES });
    const ids = jan.map((r) => r.id);
    expect(ids).toContain("ctx-family");
    expect(ids.indexOf("ctx-vietnamese")).toBeLessThan(ids.indexOf("classics"));
  });

  it("Friday night suggests horror unless the user dislikes horror", () => {
    const friday = new Date("2026-11-06T21:00:00");
    expect(
      buildRows(empty, { now: friday, allGenreIds: ALL_GENRES }).some(
        (r) => r.id === "ctx-weekend-horror",
      ),
    ).toBe(true);
    const hater: ProfileInput = {
      ...empty,
      events: [ev("dislike", [GENRE.horror]), ev("like", [GENRE.comedy])],
    };
    expect(
      buildRows(hater, { now: friday, allGenreIds: ALL_GENRES }).some(
        (r) => r.id === "ctx-weekend-horror",
      ),
    ).toBe(false);
  });

  it("Movies page: no series rows, seeds are movies only", () => {
    const tv = { ...movie(7, [18]), media_type: "tv" as const };
    const input: ProfileInput = {
      ...empty,
      events: [ev("like", [GENRE.drama])],
      watchlist: [{ movie: tv, at: NOW.getTime() }],
      reactions: { "tv-7": { reaction: "like", movie: tv, at: NOW.getTime() } },
    };
    const rows = buildRows(input, { now: NOW, allGenreIds: ALL_GENRES, scope: "movie" });
    expect(
      rows.some((r) => r.kind === "tv" || (r.kind === "context" && r.context === "kdrama")),
    ).toBe(false);
    expect(rows.some((r) => r.kind === "because")).toBe(false);
    expect(rows.some((r) => r.kind === "watchlist")).toBe(false);
  });

  it("Series page: TV rows, movie genres mapped to TV genres", () => {
    const input: ProfileInput = {
      ...empty,
      events: [ev("like", [GENRE.action]), ev("like", [GENRE.scifi])],
    };
    const rows = buildRows(input, {
      now: NOW,
      allGenreIds: [10759, 16, 35, 80, 18, 10765, 9648, 10763],
      scope: "tv",
    });
    expect(rows[0]).toMatchObject({ kind: "top10", media: "tv" });
    const genres = rows.flatMap((r) => (r.kind === "genre" ? [r.genreId] : []));
    expect(genres).toEqual(expect.arrayContaining([10759, 10765]));
    expect(rows.every((r) => r.kind !== "list" && r.kind !== "classics")).toBe(true);
    expect(rows.find((r) => r.kind === "explore")).toMatchObject({ media: "tv" });
  });
});

describe("buildRows — topics & series shelves", () => {
  const TV_GENRES = [10759, 16, 35, 80, 18, 10765, 9648];
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it("Series page has short, completed and cultivation / survival suggestions", () => {
    const rows = buildRows(empty, { now: NOW, allGenreIds: TV_GENRES, scope: "tv" });
    expect(ids(rows)).toEqual(
      expect.arrayContaining([
        "ctx-miniseries",
        "ctx-completed",
        "topic-cultivation",
        "topic-survival",
      ]),
    );
    const topic = rows.find((r) => r.id === "topic-cultivation");
    expect(topic).toMatchObject({ kind: "topic", media: "tv", followed: false });
  });

  it("followed topics rank high and are marked followed", () => {
    const rows = buildRows(empty, {
      now: NOW,
      allGenreIds: TV_GENRES,
      scope: "tv",
      followedTopics: [{ slug: "survival" }],
    });
    const i = ids(rows).indexOf("topic-survival");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(ids(rows).indexOf("tv-popular"));
    expect(rows[i]).toMatchObject({ followed: true, media: "tv" });
  });

  it("series-only topics do not appear on the Movies page", () => {
    const rows = buildRows(empty, {
      now: NOW,
      allGenreIds: ALL_GENRES,
      scope: "movie",
      followedTopics: [{ slug: "cultivation", media: "tv" }, { slug: "heist" }],
    });
    expect(ids(rows)).not.toContain("topic-cultivation");
    expect(rows.find((r) => r.id === "topic-heist")).toMatchObject({
      media: "movie",
      followed: true,
    });
  });

  it("Home: followed topics keep their own media type (cultivation → series)", () => {
    const rows = buildRows(empty, {
      now: NOW,
      allGenreIds: ALL_GENRES,
      followedTopics: [{ slug: "cultivation", media: "tv" }],
    });
    expect(rows.find((r) => r.id === "topic-cultivation")).toMatchObject({ media: "tv" });
  });

  it("liking animation ranks the cultivation suggestion higher", () => {
    const base = ids(buildRows(empty, { now: NOW, allGenreIds: TV_GENRES, scope: "tv" })).indexOf(
      "topic-cultivation",
    );
    const fan = { ...empty, events: [ev("like", [16]), ev("like", [16, 14])] };
    const boosted = ids(buildRows(fan, { now: NOW, allGenreIds: TV_GENRES, scope: "tv" })).indexOf(
      "topic-cultivation",
    );
    expect(boosted).toBeLessThan(base);
  });
});

describe("assignLayouts", () => {
  const r = (id: string, extra: Partial<RowSpec> & { kind: RowSpec["kind"] }) =>
    ({ id, ...extra }) as RowSpec;
  it("Upcoming uses large posters; spotlights favor followed topics and stay ≥ 3 rows apart", () => {
    const rows = [
      r("top10", { kind: "top10" }),
      r("b1", { kind: "because", reason: "like", movie: movie(1, []) } as never),
      r("b2", { kind: "because", reason: "view", movie: movie(2, []) } as never),
      r("t", { kind: "topic", slug: "survival", media: "movie", followed: true } as never),
      r("g", { kind: "genre", genreId: 28 } as never),
      r("up", { kind: "list", category: "upcoming" } as never),
      r("c", { kind: "classics" }),
      r("x", { kind: "trending" }),
      r("y", { kind: "trending" }),
      r("cls2", { kind: "context", context: "completed" } as never),
    ];
    const l = assignLayouts(rows);
    expect(l.up).toBe("large");
    expect(l.t).toBe("spotlight");
    // b1 is 2 rows from t → skipped; c is next to the "Upcoming" row → skipped
    expect(l.b1).toBeUndefined();
    expect(l.c).toBeUndefined();
    expect(l.cls2).toBe("spotlight");
    expect(Object.values(l).filter((v) => v === "spotlight").length).toBeLessThanOrEqual(
      MAX_SPOTLIGHTS,
    );
  });
});

describe("new on your streaming service row", () => {
  const empty: ProfileInput = { events: [], history: [], watchlist: [], reactions: {} };
  const service = { id: 8, name: "Netflix" };
  const find = (scope: "all" | "movie" | "tv", streaming: typeof service | null) =>
    buildRows(empty, { now: NOW, allGenreIds: [28, 35], scope, streaming }).find(
      (r) => r.kind === "provider",
    );

  it("appears on Home (mixed), Movies and Series for the picked service", () => {
    expect(find("all", service)).toMatchObject({ provider: service, media: undefined });
    expect(find("movie", service)).toMatchObject({ provider: service, media: "movie" });
    expect(find("tv", service)).toMatchObject({ provider: service, media: "tv" });
  });

  it("is left out until a service is picked", () => {
    expect(find("all", null)).toBeUndefined();
    expect(find("tv", null)).toBeUndefined();
  });
});
