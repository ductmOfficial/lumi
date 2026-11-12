import { describe, expect, it } from "vitest";
import { getTheme, oppositeTheme, resolveTheme } from "./registry";

describe("theme registry", () => {
  it("system follows the OS within the Classic group", () => {
    expect(resolveTheme("system", true).id).toBe("dark");
    expect(resolveTheme("system", false).id).toBe("light");
  });
  it("glass-system follows the OS within the Liquid Glass group", () => {
    expect(resolveTheme("glass-system", true).id).toBe("glass-dark");
    expect(resolveTheme("glass-system", false).id).toBe("glass-light");
  });
  it("an explicit theme ignores the OS", () => {
    expect(resolveTheme("glass-light", true).id).toBe("glass-light");
  });
  it("the quick light/dark toggle stays in the same group", () => {
    expect(oppositeTheme(getTheme("glass-dark"))).toBe("glass-light");
    expect(oppositeTheme(getTheme("glass-light"))).toBe("glass-dark");
    expect(oppositeTheme(getTheme("light"))).toBe("dark");
  });
});
