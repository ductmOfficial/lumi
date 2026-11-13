import { describe, expect, it } from "vitest";

import { localeFor } from "./index.js";

describe("localeFor", () => {
  it("picks Vietnamese only for Vietnamese", () => {
    expect(localeFor("vi")).toBe("vi");
    expect(localeFor("vi-VN")).toBe("vi");
    expect(localeFor("VI-vn,en;q=0.8")).toBe("vi");
    expect(localeFor("en-US")).toBe("en");
    expect(localeFor("fr")).toBe("en");
  });

  it("falls back to English without a language", () => {
    expect(localeFor(undefined)).toBe("en");
    expect(localeFor(null)).toBe("en");
    expect(localeFor("")).toBe("en");
  });
});
