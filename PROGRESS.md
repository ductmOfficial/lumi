# Progress

> Last updated: 2026-11-12
>
> Legend: ✅ done · 🔄 in progress · ⬜ not started

Lumi is a movie and series discovery app on the TMDB API. This repo was created from [`ductran-starter`](https://github.com/ductmOfficial/ductran-starter). This log records each step, the decisions behind it and the issues met along the way.

## Steps

| #   | Step                                                                              | Branch              | Status |
| --- | --------------------------------------------------------------------------------- | ------------------- | ------ |
| 1   | Repository from the `ductran-starter` template                                    | `main`              | ✅     |
| 2   | Rename to `lumi`, drop the sample package and the local PostgreSQL                | `chore/setup`       | ✅     |
| 3   | `@lumi/tmdb-client`: typed client, errors, images, series in the movie shape      | `feat/tmdb-client`  | ✅     |
| 4   | Worker: TMDB proxy with edge cache and rate limit                                 | `feat/worker-proxy` | ✅     |
| 5   | Web app: home feed, movie, series and people profiles, discover, search, library  | `feat/web`          | ✅     |
| 6   | Movie quiz, compare, watch together, insights                                     | `feat/tools`        | ✅     |
| 7   | Worker serves the app with link-preview metadata, robots and sitemap              | `feat/worker-site`  | ✅     |
| 8   | Playwright and axe tests on a fake TMDB, `Browser` job in CI, accessibility fixes | `test/e2e`          | ✅     |
| 9   | Sen UI tokens and components                                                      | `feat/sen-ui`       | ✅     |
| 10  | README and this progress log                                                      | `docs/readme`       | ✅     |
| 11  | Deploy the Worker `lumi` with the `TMDB_TOKEN` secret                             | —                   | ⬜     |

Each step is a pull request with green checks (`Browser` from step 8), merged with rebase.

## Decisions

| Decision                                                     | Reason                                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One Worker serves the app and the API                        | It can add per-page Open Graph metadata to the HTML, and the app keeps calling a same-origin `/api/tmdb` with no CORS                                                   |
| `@lumi/tmdb-client` takes its config instead of reading env  | The app passes Vite env values, the Worker and the tests pass their own; the package stays free of build-tool globals                                                   |
| `@lumi/i18n` as a package                                    | The Worker writes page titles and descriptions in the visitor's language with the same messages as the app                                                              |
| "New on your streaming service" instead of one fixed service | The user picks a service from TMDB's providers for their region; nothing in the app is named after a single company                                                     |
| Search links only for services with a known search page      | TMDB does not return the services' own title ids; JustWatch's link stays available for every title                                                                      |
| Personalization stays rule-based                             | TMDB API Terms (section 1.C) forbid using TMDB data for machine learning or AI                                                                                          |
| Personal data stays in `localStorage`                        | No accounts are needed to try the app; lists are shared through the URL                                                                                                 |
| Browser tests on a fake TMDB                                 | The tests need no token or network, and they show only fictional titles and generated images                                                                            |
| Sen UI tokens hold each theme's palette                      | The app's role names alias the tokens, so Tailwind utilities and Sen UI components cannot drift apart; screenshots match the previous build except the Settings selects |
| TypeScript 6, not 7                                          | `typescript-eslint` does not support TypeScript 7 yet                                                                                                                   |

## Issues

| Issue                                                                                                                             | Fix                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Strict type-aware ESLint flagged browser feature checks such as `navigator.share` as always true                                  | Feature checks use `"share" in navigator`, which is also what runs correctly in browsers without the API                            |
| `noUncheckedIndexedAccess` surfaced unguarded array reads                                                                         | Guards or `at()`; tests read with optional chaining instead of non-null assertions                                                  |
| `delete` on copies of persisted records                                                                                           | `omitKey` returns a copy without the key                                                                                            |
| YouTube players need `allow-same-origin` with `allow-scripts`                                                                     | The frames are cross-origin, so the pair only keeps YouTube's own origin; the lint rule is disabled on those lines with that reason |
| pnpm 12 blocks the postinstall scripts of esbuild and workerd                                                                     | Both only verify binaries that pnpm already installs as platform packages, so `allowBuilds` sets them to `false`                    |
| axe: dot pagers smaller than 24 px, unnamed photo buttons, `aria-label` on a `<p>`, light-theme contrast, no `h1` on the 404 page | Larger hit areas around the same dots, labels, `role="img"`, darker light-theme accent, success and warning colors, a heading       |
| React Aria deprecated `selectedKey` on `Select`                                                                                   | `value` and `onChange`                                                                                                              |
