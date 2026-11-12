import { describe, expect, it } from "vitest";

import { slugify } from "./slug.js";

describe("slugify", () => {
  it("strips Vietnamese diacritics and đ", () => {
    expect(slugify("Đất Rừng Phương Nam")).toBe("dat-rung-phuong-nam");
  });
  it("collapses special characters", () => {
    expect(slugify("Dune: Part Two!!")).toBe("dune-part-two");
  });
  it("truncates without a trailing dash", () => {
    expect(slugify("a ".repeat(80), 10)).toBe("a-a-a-a-a");
  });
});
