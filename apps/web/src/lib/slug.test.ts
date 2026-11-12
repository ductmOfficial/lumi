import { describe, expect, it } from "vitest";
import { mediaKey, movieHref, parseIdParam, personHref } from "./slug";

describe("parseIdParam / href", () => {
  it("reads the id from a slug", () => {
    expect(parseIdParam("693134-dune-part-two")).toBe(693134);
    expect(parseIdParam("42")).toBe(42);
    expect(parseIdParam("abc")).toBeNaN();
    expect(parseIdParam(undefined)).toBeNaN();
  });
  it("builds links with a slug", () => {
    expect(movieHref({ id: 1, title: "Mai" })).toBe("/movie/1-mai");
    expect(personHref({ id: 2, name: "Amélie Poulain" })).toBe("/person/2-amelie-poulain");
    expect(movieHref({ id: 3, title: "???" })).toBe("/movie/3");
  });
});

describe("links & keys by media type", () => {
  it("series link to /tv, keys never collide with a movie of the same id", () => {
    const series = { id: 5, title: "Mai", media_type: "tv" as const };
    expect(movieHref(series)).toBe("/tv/5-mai");
    expect(mediaKey(series)).not.toBe(mediaKey({ id: 5 }));
  });
});
