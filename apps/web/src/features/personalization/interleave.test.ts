import { describe, expect, it } from "vitest";
import { interleave, isoDayOffset } from "./interleave";

describe("interleave", () => {
  it("interleaves and appends the remainder", () => {
    expect(interleave<number | string>([1, 2, 3], ["a"])).toEqual([1, "a", 2, 3]);
    expect(interleave([], [1, 2])).toEqual([1, 2]);
  });
  it("steps back across month/year boundaries", () => {
    expect(isoDayOffset(new Date(2026, 0, 10), -45)).toBe("2025-11-26");
    expect(isoDayOffset(new Date(2026, 10, 8), 0)).toBe("2026-11-08");
  });
});
