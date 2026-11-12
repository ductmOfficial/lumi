import { needsClientToken, TMDB_IMAGE_BASE } from "./config.js";
import { imageSrcSet, imageUrl } from "./image.js";
import type { TmdbErrorBody } from "./types.js";

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

export class TmdbError extends Error {
  readonly status: number;
  readonly code?: number;

  constructor(status: number, message: string, code?: number) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
    this.code = code;
  }
}

export class MissingTokenError extends Error {
  constructor() {
    super(
      "Missing VITE_TMDB_ACCESS_TOKEN. Copy .env.example to apps/web/.env and fill in the token, or point VITE_TMDB_API_BASE at the proxy.",
    );
    this.name = "MissingTokenError";
  }
}

/** Builds a request URL; a relative base (the same-origin proxy) resolves against the page. */
export function buildUrl(path: string, params: QueryParams, apiBase: string): URL {
  const origin = (globalThis as { location?: { origin: string } }).location?.origin;
  const url = new URL(apiBase.replace(/\/$/, "") + path, origin ?? "http://localhost");
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

export interface TmdbClientConfig {
  /** TMDB itself (needs `token`) or the proxy path. */
  apiBase: string;
  /** API Read Access Token (v4). Only for local development; never ship it to browsers. */
  token?: string | undefined;
  imageBase?: string | undefined;
  fetch?: typeof fetch;
}

export interface TmdbClient {
  readonly apiBase: string;
  fetch: <T>(path: string, params?: QueryParams, signal?: AbortSignal) => Promise<T>;
  image: (path: string | null | undefined, size: string) => string | undefined;
  srcSet: (path: string | null | undefined, sizes: readonly `w${number}`[]) => string | undefined;
}

/**
 * The single entry point for TMDB requests. With a token it calls TMDB directly;
 * without one it goes through the proxy.
 */
export function createTmdbClient(config: TmdbClientConfig): TmdbClient {
  const { apiBase, token } = config;
  const imageBase = config.imageBase ?? TMDB_IMAGE_BASE;
  const direct = needsClientToken(apiBase);

  return {
    apiBase,
    fetch: async <T>(path: string, params: QueryParams = {}, signal?: AbortSignal): Promise<T> => {
      if (direct && !token) throw new MissingTokenError();

      const headers: Record<string, string> = { Accept: "application/json" };
      if (direct && token) headers.Authorization = `Bearer ${token}`;

      const doFetch = config.fetch ?? globalThis.fetch;
      const res = await doFetch(buildUrl(path, params, apiBase), { signal, headers });

      if (!res.ok) {
        let body: TmdbErrorBody = {};
        try {
          body = (await res.json()) as TmdbErrorBody;
        } catch {
          // non-JSON error body
        }
        throw new TmdbError(res.status, body.status_message ?? res.statusText, body.status_code);
      }

      return (await res.json()) as T;
    },
    image: (path, size) => imageUrl(imageBase, path, size),
    srcSet: (path, sizes) => imageSrcSet(imageBase, path, sizes),
  };
}
