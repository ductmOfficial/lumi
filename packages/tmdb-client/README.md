# @lumi/tmdb-client

Typed client for the [TMDB API](https://developer.themoviedb.org), shared by the Lumi web app, the Worker and the tests.

- `createTmdbClient({ apiBase, token?, imageBase?, fetch? })` returns `fetch`, `image` and `srcSet`. With `apiBase` set to TMDB itself it sends the token; with the proxy path (`TMDB_PROXY_API`) it sends nothing, and the Worker adds the token.
- `resolveApiBase(token, configured)` picks TMDB or the proxy, so a build without a token always goes through the proxy.
- `TmdbError` carries the HTTP status and TMDB's own error code; `MissingTokenError` explains how to configure local development.
- `normalizeTvDetail`, `normalizeTvSummary` and `normalizeTvPage` turn series into the movie shape plus `media_type: "tv"`, so cards, rows and profiles work for both. Appended responses that TMDB leaves out become empty lists.
- `slugify` builds URL slugs and strips diacritics, including Vietnamese `đ`.

```ts
import { createTmdbClient, TMDB_PROXY_API, type MovieDetail } from "@lumi/tmdb-client";

const tmdb = createTmdbClient({ apiBase: TMDB_PROXY_API });
const movie = await tmdb.fetch<MovieDetail>("/movie/550", { language: "vi-VN" });
const poster = tmdb.image(movie.poster_path, "w342");
```

The package is plain TypeScript with no runtime dependencies; `pnpm --filter @lumi/tmdb-client test:coverage` keeps it above 90%.
