import { AxeBuilder } from "@axe-core/playwright";

import { expect, test } from "./fixtures";

const pages = [
  "/",
  "/movies",
  "/series",
  "/movie/104",
  "/tv/120",
  "/person/5001",
  "/discover",
  "/discover/browse?genres=878",
  "/search?q=harbor",
  "/watchlist",
  "/settings",
  "/insights",
];

for (const path of pages) {
  test.describe(path, () => {
    for (const scheme of ["dark", "light"] as const) {
      test(`has no WCAG 2.2 AA violations (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(path);
        await expect(page.locator("main")).toBeVisible();
        await page.waitForLoadState("networkidle");
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          violations,
          violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`).join("\n"),
        ).toEqual([]);
      });
    }

    test("does not scroll sideways", async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  });
}
