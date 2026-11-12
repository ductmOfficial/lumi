/**
 * TMDB proxy for a Cloudflare Worker: keeps the token server-side, caches at the edge
 * and only allows read-only (GET/HEAD) access to public endpoints.
 */

import { TMDB_DIRECT_API as TMDB_API, TMDB_PROXY_API } from "@lumi/tmdb-client";

export const PROXY_PREFIX = TMDB_PROXY_API;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** TMDB API Terms: data must not be cached for more than 6 months — every TTL stays far below this */
export const MAX_TTL = 180 * DAY;

/** Endpoint groups the app never needs (session-bound or write operations) */
const BLOCKED = /^\/(account|authentication|guest_session|list)(\/|$)/;
const SAFE_PATH = /^\/[A-Za-z0-9_\-./]+$/;
/** Query parameters that are never forwarded */
const STRIPPED_PARAMS = ["api_key", "session_id", "guest_session_id"];

/** Edge cache TTL in seconds, by kind of data. */
export function edgeTtlFor(path: string): number {
  if (/^\/(configuration|genre)\//.test(path) || path.startsWith("/watch/providers/"))
    return 7 * DAY;
  if (/^\/(trending|discover|search)\//.test(path)) return HOUR;
  if (/^\/(movie|tv)\/(popular|top_rated|now_playing|upcoming|on_the_air|airing_today)$/.test(path))
    return HOUR;
  if (/^\/(movie|tv|person|collection|keyword)\/\d+/.test(path)) return 6 * HOUR;
  return HOUR;
}

/** Browsers cache briefly: TanStack Query already keeps data in memory */
export const browserTtlFor = (path: string) => Math.min(edgeTtlFor(path), 5 * MINUTE);

export type ProxyTarget =
  | { ok: true; upstream: URL; cacheKey: string; path: string }
  | { ok: false; status: number; message: string };

/** Validates the request and builds the upstream TMDB URL. Query params are sorted for a stable cache key. */
export function resolveTarget(requestUrl: string, method: string): ProxyTarget {
  if (method !== "GET" && method !== "HEAD")
    return { ok: false, status: 405, message: "Method not allowed" };
  const url = new URL(requestUrl);
  if (!url.pathname.startsWith(PROXY_PREFIX + "/"))
    return { ok: false, status: 404, message: "Not found" };
  const path = url.pathname.slice(PROXY_PREFIX.length);
  if (!SAFE_PATH.test(path) || path.includes(".."))
    return { ok: false, status: 400, message: "Invalid path" };
  if (BLOCKED.test(path)) return { ok: false, status: 403, message: "Endpoint not available" };

  const params = [...url.searchParams.entries()]
    .filter(([k]) => !STRIPPED_PARAMS.includes(k))
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
  const query = new URLSearchParams(params).toString();
  const upstream = new URL(TMDB_API + path);
  upstream.search = query;
  const cacheKey = `${url.origin}${PROXY_PREFIX}${path}${query ? `?${query}` : ""}`;
  return { ok: true, upstream, cacheKey, path };
}

export function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ success: false, status_message: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Minimal shape of the Cloudflare Rate Limiting binding */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Minimal shape of the Cache API (caches.default), so it can be faked in tests */
export interface EdgeCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}

export interface ProxyDeps {
  token: string | undefined;
  fetch: typeof fetch;
  cache?: EdgeCache;
  limiter?: RateLimiter;
  clientKey: string;
  waitUntil: (promise: Promise<unknown>) => void;
}

export async function handleTmdb(request: Request, deps: ProxyDeps): Promise<Response> {
  const target = resolveTarget(request.url, request.method);
  if (!target.ok) return jsonError(target.status, target.message);
  if (!deps.token) return jsonError(500, "TMDB_TOKEN is not configured");

  if (deps.limiter) {
    const { success } = await deps.limiter.limit({ key: deps.clientKey });
    if (!success) {
      const res = jsonError(429, "Too many requests");
      res.headers.set("Retry-After", "60");
      return res;
    }
  }

  const cached = await deps.cache?.match(target.cacheKey);
  if (cached) {
    const hit = new Response(cached.body, cached);
    hit.headers.set("X-Cache", "HIT");
    return hit;
  }

  let upstream: Response;
  try {
    upstream = await deps.fetch(target.upstream.toString(), {
      headers: { Accept: "application/json", Authorization: `Bearer ${deps.token}` },
    });
  } catch {
    return jsonError(502, "Upstream unavailable");
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("Content-Type") ?? "application/json; charset=utf-8",
    "X-Cache": "MISS",
  });
  if (upstream.ok) {
    const edge = Math.min(edgeTtlFor(target.path), MAX_TTL);
    headers.set("Cache-Control", `public, max-age=${browserTtlFor(target.path)}, s-maxage=${edge}`);
    const res = new Response(upstream.body, { status: upstream.status, headers });
    if (deps.cache) deps.waitUntil(deps.cache.put(target.cacheKey, res.clone()));
    return res;
  }
  // Upstream error: pass the TMDB message through, never cache it
  headers.set("Cache-Control", "no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
}
