export const TMDB_DIRECT_API = "https://api.themoviedb.org/3";
/** Same-origin path served by the Worker proxy, which adds the token server-side. */
export const TMDB_PROXY_API = "/api/tmdb";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const trimSlash = (url: string) => url.replace(/\/$/, "");

/** Calling TMDB directly requires a client token; the proxy adds it server-side. */
export function needsClientToken(apiBase: string): boolean {
  return trimSlash(apiBase) === TMDB_DIRECT_API;
}

/**
 * Direct TMDB access needs a client token. Without one (every production build) a base
 * that points at TMDB itself is replaced by the proxy, so a copied env example keeps working.
 */
export function resolveApiBase(
  clientToken: string | undefined,
  configured: string | undefined,
): string {
  if (clientToken) return configured ?? TMDB_DIRECT_API;
  if (configured && !needsClientToken(configured)) return configured;
  return TMDB_PROXY_API;
}
