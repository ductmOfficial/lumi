import { resolveApiBase, TMDB_IMAGE_BASE } from "@lumi/tmdb-client";

export const APP_NAME = "Lumi";

const token = import.meta.env.VITE_TMDB_ACCESS_TOKEN || undefined;
const configuredBase = import.meta.env.VITE_TMDB_API_BASE || undefined;

export const env = {
  /** Only set in local development; production builds strip it (see vite.config.ts). */
  tmdbToken: token,
  tmdbApiBase: resolveApiBase(token, configuredBase),
  tmdbImageBase: import.meta.env.VITE_TMDB_IMAGE_BASE ?? TMDB_IMAGE_BASE,
};
