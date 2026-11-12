import { describe, expect, it } from "vitest";

import { omitKey } from "./record";

describe("omitKey", () => {
  it("returns a copy without the key and leaves the original alone", () => {
    const original: Record<string, number> = { a: 1, b: 2 };
    expect(omitKey(original, "a")).toEqual({ b: 2 });
    expect(original).toEqual({ a: 1, b: 2 });
  });

  it("works with numeric keys", () => {
    const byId: Record<number, string> = { 1: "x", 2: "y" };
    expect(omitKey(byId, 2)).toEqual({ 1: "x" });
  });
});
