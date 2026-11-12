import { handleTmdb, jsonError, PROXY_PREFIX, type RateLimiter } from "./tmdbProxy";

export interface Env {
  /** TMDB API Read Access Token, set with `wrangler secret put TMDB_TOKEN` */
  TMDB_TOKEN?: string;
  /** Optional Rate Limiting binding, declared in wrangler.jsonc */
  TMDB_LIMITER?: RateLimiter;
}

export default {
  fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith(PROXY_PREFIX + "/"))
      return Promise.resolve(jsonError(404, "Not found"));

    return handleTmdb(request, {
      token: env.TMDB_TOKEN,
      fetch: (input, init) => fetch(input, init),
      cache: caches.default,
      limiter: env.TMDB_LIMITER,
      clientKey: request.headers.get("CF-Connecting-IP") ?? "unknown",
      waitUntil: (p) => {
        ctx.waitUntil(p);
      },
    });
  },
} satisfies ExportedHandler<Env>;
