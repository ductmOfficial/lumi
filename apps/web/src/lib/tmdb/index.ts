import { createTmdbClient } from "@lumi/tmdb-client";

import { env } from "@/config/env";

export * from "@lumi/tmdb-client";

const client = createTmdbClient({
  apiBase: env.tmdbApiBase,
  token: env.tmdbToken,
  imageBase: env.tmdbImageBase,
});

/** Every TMDB request in the app goes through this client. */
export const tmdbFetch = client.fetch;
export const tmdbImage = client.image;
export const tmdbSrcSet = client.srcSet;
