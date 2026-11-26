import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { movieDetail } from "./fake-tmdb";

// The narrowest phone the layout is designed for (iPhone 12 to 16).
const width = 390;

// Real titles usually have a trailer, which adds one more button to the row.
const withTrailer = (page: Page, id: number) =>
  page.route(new RegExp(`/api/tmdb/movie/${String(id)}(\\?|$)`), (route) =>
    route.fulfill({
      json: {
        ...movieDetail(id),
        videos: {
          results: [
            {
              id: `trailer-${String(id)}`,
              key: `trailer-${String(id)}`,
              name: "Official Trailer",
              site: "YouTube",
              type: "Trailer",
              official: true,
              iso_639_1: "en",
              published_at: "2025-01-01T00:00:00.000Z",
              size: 1080,
            },
          ],
        },
      },
    }),
  );

/** Every button sits on one line inside the viewport, and none is narrower than its content. */
async function expectOneUncutRow(page: Page, buttons: Locator[]) {
  const boxes = await Promise.all(buttons.map((b) => b.boundingBox()));
  const first = boxes[0];
  expect(first).not.toBeNull();
  for (const box of boxes) {
    expect(box).not.toBeNull();
    expect(box?.y).toBe(first?.y);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
  }
  // a cut label: the button or a label inside it (ellipsis) is narrower than its content
  for (const button of buttons) {
    const cut = await button.evaluate((el) =>
      [el, ...el.querySelectorAll("span")].some((e) => e.scrollWidth > e.clientWidth),
    );
    expect(cut).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

const locales = [
  {
    locale: "en-US",
    add: "My List",
    added: "In My List",
    names: ["Like", "Not for me", "Mark as watched", "Trailer", "More"],
  },
  {
    locale: "vi-VN",
    add: "Danh sách",
    added: "Đã thêm",
    names: ["Thích", "Không quan tâm", "Đánh dấu đã xem", "Trailer", "Thêm"],
  },
];

for (const { locale, add, added, names } of locales) {
  test.describe(`a ${String(width)}px phone in ${locale}`, () => {
    test.use({ viewport: { width, height: 844 }, locale });

    test("shows the movie actions on one line without cutting the List button", async ({
      page,
    }) => {
      await withTrailer(page, 104);
      await page.goto("/movie/104");
      const others = names.map((name) => page.getByRole("button", { name, exact: true }));

      const addButton = page.getByRole("button", { name: add, exact: true });
      await expect(addButton).toBeVisible();
      await expect(addButton).toHaveAttribute("aria-pressed", "false");
      await expectOneUncutRow(page, [addButton, ...others]);

      await addButton.click();
      const addedButton = page.getByRole("button", { name: added, exact: true });
      await expect(addedButton).toHaveAttribute("aria-pressed", "true");
      await expectOneUncutRow(page, [addedButton, ...others]);
    });
  });
}
