import { expect, test } from "./fixtures";
import { titleFor } from "./fake-tmdb";

test("home shows the hero, rows and the TMDB notice", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Lumi/);
  await expect(page.locator("main section").first()).toBeVisible();
  await expect(
    page.getByText(/not endorsed, certified, or otherwise approved by TMDB/),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "TMDB" }).first()).toBeVisible();
});

test.describe("first visit", () => {
  test.use({ onboarding: "pending" });

  test("offers onboarding, which can be skipped", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /Bỏ qua/ }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test("a movie profile shows its details, where to watch and tabs", async ({ page }) => {
  await page.goto("/movie/104");
  await expect(page.getByRole("heading", { level: 1, name: titleFor(104) })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Xem ở đâu" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Lantern+" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /JustWatch/ }).first()).toBeVisible();

  await page.getByRole("link", { name: "Giới thiệu" }).first().click();
  await expect(page).toHaveURL(/\/movie\/104[^/]*\/about$/);
  await expect(page.getByRole("heading", { name: "Thông tin chi tiết" })).toBeVisible();
});

test("a series profile lists its seasons", async ({ page }) => {
  await page.goto("/tv/120/seasons");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Season 1").first()).toBeVisible();
  await expect(page.getByText("Season 2").first()).toBeVisible();
});

test("a person profile shows the career", async ({ page }) => {
  await page.goto("/person/5001");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Phim" }).last().click();
  await expect(page.getByText("Role 1").first()).toBeVisible();
});

test("search finds titles", async ({ page }) => {
  await page.goto("/search?q=harbor");
  await expect(page.locator("main").getByRole("link").first()).toBeVisible();
});

test("discover filters live in the URL", async ({ page }) => {
  await page.goto("/discover/browse?genres=878");
  await expect(page.locator("main").getByRole("link").first()).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/genres=878/);
});

test("the streaming row appears once a service is picked", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Mới trên/)).toHaveCount(0);

  await page.goto("/settings");
  await page.getByRole("button", { name: /Dịch vụ phát bạn dùng/ }).click();
  await page.getByRole("option", { name: "Lantern+" }).click();

  await page.goto("/");
  await expect(page.getByText("Mới trên Lantern+").first()).toBeVisible();
});

test("a list can be created and deleted after confirming", async ({ page }) => {
  await page.goto("/watchlist?tab=lists");
  await page.getByRole("textbox", { name: "Danh sách mới" }).fill("Cuối tuần");
  await page.getByRole("button", { name: "Tạo" }).click();
  await page.getByRole("link", { name: /Cuối tuần/ }).click();

  await page.getByRole("button", { name: "Xoá danh sách" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Xoá danh sách" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Huỷ" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Xoá danh sách" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Xoá danh sách" }).click();
  await expect(page).toHaveURL(/tab=lists/);
  await expect(page.getByRole("link", { name: /Cuối tuần/ })).toHaveCount(0);
});

test("deleting all data asks first", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Xoá tất cả" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Xoá toàn bộ dữ liệu" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Xoá tất cả" })).toBeFocused();
});

test.describe("a browser in English", () => {
  test.use({ locale: "en-US" });

  test("starts in English and keeps the language the user picks", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "My List" }).first()).toBeVisible();

    await page.getByRole("button", { name: /Chuyển sang Tiếng Việt/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });
});

test("the header switches the language", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Chuyển sang English/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "My List" }).first()).toBeVisible();
});

test("the header switches between light and dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-scheme", "dark");
  await page.getByRole("button", { name: "Giao diện" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-scheme", "light");
});

for (const path of ["/play", "/compare", "/together", "/insights", "/watchlist", "/discover"]) {
  test(`${path} renders`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
}

test("unknown pages show not found", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Trang chủ|Home/ }).first()).toBeVisible();
});
