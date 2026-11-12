import { describe, expect, it, vi } from "vitest";
import {
  edgeTtlFor,
  handleTmdb,
  MAX_TTL,
  resolveTarget,
  type EdgeCache,
  type ProxyDeps,
} from "./tmdbProxy";

const ORIGIN = "https://lumi.example";

function memoryCache(): EdgeCache & { store: Map<string, Response> } {
  const store = new Map<string, Response>();
  return {
    store,
    match: (key) => Promise.resolve(store.get(key)?.clone()),
    put: (key, res) => {
      store.set(key, res);
      return Promise.resolve();
    },
  };
}

function deps(overrides: Partial<ProxyDeps> = {}): ProxyDeps {
  return {
    token: "test-token",
    fetch: vi.fn(() =>
      Promise.resolve(
        new Response('{"id":1}', { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    ),
    clientKey: "1.2.3.4",
    waitUntil: (p) => void p,
    ...overrides,
  };
}

describe("resolveTarget", () => {
  it("maps the proxy path to TMDB, drops credentials and sorts the query", () => {
    const t = resolveTarget(
      `${ORIGIN}/api/tmdb/movie/550?language=vi-VN&api_key=leak&append_to_response=videos`,
      "GET",
    );
    expect(t.ok && t.upstream.toString()).toBe(
      "https://api.themoviedb.org/3/movie/550?append_to_response=videos&language=vi-VN",
    );
    expect(t.ok && t.cacheKey).toBe(
      `${ORIGIN}/api/tmdb/movie/550?append_to_response=videos&language=vi-VN`,
    );
  });

  it("rejects writes, account endpoints and path tricks", () => {
    expect(resolveTarget(`${ORIGIN}/api/tmdb/movie/550/rating`, "POST")).toMatchObject({
      ok: false,
      status: 405,
    });
    expect(resolveTarget(`${ORIGIN}/api/tmdb/account/1`, "GET")).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(resolveTarget(`${ORIGIN}/api/tmdb/authentication/token/new`, "GET")).toMatchObject({
      ok: false,
      status: 403,
    });
    // the URL parser resolves dot segments, so traversal can only land outside the proxy prefix
    expect(resolveTarget(`${ORIGIN}/api/tmdb/%2e%2e/%2e%2e/secret`, "GET")).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(resolveTarget(`${ORIGIN}/api/tmdb/movie/<script>`, "GET")).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(resolveTarget(`${ORIGIN}/api/other`, "GET")).toMatchObject({ ok: false, status: 404 });
  });
});

describe("edgeTtlFor", () => {
  it("keeps reference data longer than fast-moving lists, always under 6 months", () => {
    expect(edgeTtlFor("/genre/movie/list")).toBeGreaterThan(edgeTtlFor("/movie/550"));
    expect(edgeTtlFor("/movie/550")).toBeGreaterThan(edgeTtlFor("/trending/all/week"));
    for (const p of ["/configuration/languages", "/movie/1", "/search/multi", "/discover/tv"])
      expect(edgeTtlFor(p)).toBeLessThan(MAX_TTL);
  });
});

describe("handleTmdb", () => {
  it("adds the bearer token upstream and never leaks it to the client", async () => {
    const d = deps();
    const res = await handleTmdb(new Request(`${ORIGIN}/api/tmdb/movie/550`), d);
    expect(res.status).toBe(200);
    const init = vi.mocked(d.fetch).mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect([...res.headers.values()].join(" ")).not.toContain("test-token");
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=\d+/);
  });

  it("serves the second request from the edge cache", async () => {
    const cache = memoryCache();
    const d = deps({ cache });
    await handleTmdb(new Request(`${ORIGIN}/api/tmdb/movie/550`), d);
    const res = await handleTmdb(new Request(`${ORIGIN}/api/tmdb/movie/550`), d);
    expect(res.headers.get("X-Cache")).toBe("HIT");
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not cache upstream errors", async () => {
    const cache = memoryCache();
    const d = deps({
      cache,
      fetch: vi.fn(() =>
        Promise.resolve(new Response('{"status_message":"nope"}', { status: 404 })),
      ),
    });
    const res = await handleTmdb(new Request(`${ORIGIN}/api/tmdb/movie/0`), d);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(cache.store.size).toBe(0);
  });

  it("returns 429 when the rate limiter refuses", async () => {
    const d = deps({ limiter: { limit: () => Promise.resolve({ success: false }) } });
    const res = await handleTmdb(new Request(`${ORIGIN}/api/tmdb/movie/550`), d);
    expect(res.status).toBe(429);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("fails clearly when the token secret is missing", async () => {
    const res = await handleTmdb(
      new Request(`${ORIGIN}/api/tmdb/movie/550`),
      deps({ token: undefined }),
    );
    expect(res.status).toBe(500);
  });
});
