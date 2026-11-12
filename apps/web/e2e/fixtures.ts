import { test as base, expect } from "@playwright/test";

import { fakeTmdb, placeholderImage } from "./fake-tmdb";

/**
 * Every test runs against the fake TMDB: API calls to the proxy path, images and the YouTube
 * player never leave the browser.
 */
export const test = base.extend<{ onboarding: "pending" | "skipped" }>({
  /** The first-visit onboarding sheet; most tests start with it already skipped. */
  onboarding: ["skipped", { option: true }],
  page: async ({ page, onboarding }, provide) => {
    await page.addInitScript((status) => {
      const key = "lumi:personalization";
      if (status === "skipped" && !localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({ state: { onboarding: { status, genreIds: [] } }, version: 0 }),
        );
    }, onboarding);
    await page.route("**/api/tmdb/**", async (route) => {
      const url = new URL(route.request().url());
      const body = fakeTmdb(url.pathname.replace(/^\/api\/tmdb/, ""), url.searchParams);
      await route.fulfill({ json: body });
    });
    await page.route("https://image.tmdb.org/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: placeholderImage(new URL(route.request().url()).pathname),
      }),
    );
    await page.route(/youtube(-nocookie)?\.com/, (route) => route.abort());
    await provide(page);
  },
});

export { expect };
