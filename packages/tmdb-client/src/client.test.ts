import { describe, expect, it, vi } from "vitest";

import { buildUrl, createTmdbClient, MissingTokenError, TmdbError } from "./client.js";
import { needsClientToken, resolveApiBase, TMDB_DIRECT_API, TMDB_PROXY_API } from "./config.js";
import { imageSrcSet, imageUrl } from "./image.js";

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

describe("config", () => {
  it("only requires a client token for direct TMDB access", () => {
    expect(needsClientToken("https://api.themoviedb.org/3/")).toBe(true);
    expect(needsClientToken(TMDB_PROXY_API)).toBe(false);
  });

  it("falls back to the proxy whenever there is no client token", () => {
    expect(resolveApiBase(undefined, undefined)).toBe(TMDB_PROXY_API);
    expect(resolveApiBase(undefined, TMDB_DIRECT_API)).toBe(TMDB_PROXY_API);
    expect(resolveApiBase(undefined, "https://proxy.example/tmdb")).toBe(
      "https://proxy.example/tmdb",
    );
    expect(resolveApiBase("t", undefined)).toBe(TMDB_DIRECT_API);
  });
});

describe("buildUrl", () => {
  it("builds proxy URLs relative to the page and skips empty params", () => {
    const url = buildUrl(
      "/movie/550",
      { language: "vi-VN", page: undefined, query: "", adult: false, year: null },
      "/api/tmdb",
    );
    expect(url.pathname).toBe("/api/tmdb/movie/550");
    expect(url.search).toBe("?language=vi-VN&adult=false");
  });
});

describe("createTmdbClient", () => {
  it("sends the token only when calling TMDB directly", async () => {
    const fetch = vi.fn(() => Promise.resolve(json({ id: 550 })));
    const direct = createTmdbClient({ apiBase: TMDB_DIRECT_API, token: "secret", fetch });
    await expect(direct.fetch("/movie/550")).resolves.toEqual({ id: 550 });
    expect(fetch.mock.calls[0]).toMatchObject([
      expect.any(URL),
      { headers: { Authorization: "Bearer secret" } },
    ]);

    const proxied = createTmdbClient({ apiBase: TMDB_PROXY_API, token: "secret", fetch });
    await proxied.fetch("/movie/550", { language: "en-US" });
    const [url, init] = fetch.mock.calls[1] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/api/tmdb/movie/550");
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("refuses direct calls without a token", async () => {
    const client = createTmdbClient({ apiBase: TMDB_DIRECT_API, fetch: vi.fn() });
    await expect(client.fetch("/movie/550")).rejects.toBeInstanceOf(MissingTokenError);
  });

  it("turns error responses into TmdbError with TMDB's message", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(
        json({ status_code: 34, status_message: "Not found" }, { status: 404, statusText: "NF" }),
      ),
    );
    const client = createTmdbClient({ apiBase: TMDB_PROXY_API, fetch });
    const error = await client.fetch("/movie/0").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TmdbError);
    expect(error).toMatchObject({ status: 404, code: 34, message: "Not found" });
  });

  it("falls back to the status text for non-JSON errors", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response("busy", { status: 429, statusText: "Too Many Requests" })),
    );
    const client = createTmdbClient({ apiBase: TMDB_PROXY_API, fetch });
    await expect(client.fetch("/trending/all/day")).rejects.toMatchObject({
      status: 429,
      message: "Too Many Requests",
    });
  });

  it("builds image URLs from the configured base", () => {
    const client = createTmdbClient({ apiBase: TMDB_PROXY_API, imageBase: "https://img.test" });
    expect(client.image("/p.jpg", "w342")).toBe("https://img.test/w342/p.jpg");
    expect(client.image(null, "w342")).toBeUndefined();
    expect(client.srcSet("/p.jpg", ["w185", "w342"])).toBe(
      "https://img.test/w185/p.jpg 185w, https://img.test/w342/p.jpg 342w",
    );
  });
});

describe("image helpers", () => {
  it("returns nothing without a path", () => {
    expect(imageUrl("https://img.test", undefined, "w92")).toBeUndefined();
    expect(imageSrcSet("https://img.test", "", ["w92"])).toBeUndefined();
  });
});
