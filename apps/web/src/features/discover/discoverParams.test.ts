import { describe, expect, it } from "vitest";
import { discoverParams, type DiscoverFilters } from "./api/queries";

const base: DiscoverFilters = { media: "movie", genres: [], sort: "popularity.desc" };
const TODAY = "2026-11-08";

describe("discoverParams", () => {
  it("decade → movie release date range", () => {
    const p = discoverParams({ ...base, decade: 1990 }, "VN", undefined, TODAY);
    expect(p["primary_release_date.gte"]).toBe("1990-01-01");
    expect(p["primary_release_date.lte"]).toBe("1999-12-31");
  });

  it("series use first_air_date and send no region", () => {
    const p = discoverParams(
      { ...base, media: "tv", decade: 2020, sort: "primary_release_date.desc" },
      "VN",
      undefined,
      TODAY,
    );
    expect(p.region).toBeUndefined();
    expect(p.sort_by).toBe("first_air_date.desc");
    expect(p["first_air_date.gte"]).toBe("2020-01-01");
    // an unfinished decade + newest first → capped at today
    expect(p["first_air_date.lte"]).toBe(TODAY);
  });

  it("language, keywords, provider", () => {
    const p = discoverParams(
      { ...base, lang: "ko", provider: 8 },
      "VN",
      { with_keywords: 4379 },
      TODAY,
    );
    expect(p.with_original_language).toBe("ko");
    expect(p.with_keywords).toBe("4379");
    expect(p.with_watch_providers).toBe(8);
    expect(p.watch_region).toBe("VN");
  });

  it("series: status & format; ignored for movies", () => {
    const tv = discoverParams(
      { ...base, media: "tv", status: "ended", format: "miniseries" },
      "VN",
      undefined,
      TODAY,
    );
    expect(tv.with_status).toBe("3");
    expect(tv.with_type).toBe("2");
    const movie = discoverParams(
      { ...base, status: "ended", format: "miniseries" },
      "VN",
      undefined,
      TODAY,
    );
    expect(movie.with_status).toBeUndefined();
    expect(movie.with_type).toBeUndefined();
  });

  it("hand-picked keywords AND the topic keyword group", () => {
    expect(
      discoverParams({ ...base, keywords: [10, 20] }, "VN", undefined, TODAY).with_keywords,
    ).toBe("10,20");
    expect(
      discoverParams({ ...base, keywords: [10] }, "VN", { with_keywords: "1|2" }, TODAY)
        .with_keywords,
    ).toBe("1|2,10");
    expect(discoverParams(base, "VN", undefined, TODAY).with_keywords).toBeUndefined();
  });

  it("no provider means no watch_region", () => {
    expect(discoverParams(base, "VN", undefined, TODAY).watch_region).toBeUndefined();
  });
});
