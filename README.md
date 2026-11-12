# Lumi

[![CI](https://github.com/ductmOfficial/lumi/actions/workflows/ci.yml/badge.svg)](https://github.com/ductmOfficial/lumi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A movie and series discovery app built on the TMDB API. Vietnamese and English, rule-based personalization (no AI or machine learning), and every bit of personal data stays in the browser.

> Status: the web app and the Worker are complete; the Worker deploys to Cloudflare as `lumi`. See [PROGRESS.md](PROGRESS.md).

## Features

- **Home** with a banner, the week's Top 10, rows by taste, topic and context (weekends, holidays…), _Up next_ episodes, and _New on your streaming service_ once you pick one in Settings.
- **Profiles for movies, series and people** in a social-feed layout: timeline, videos with a mini player on scroll, photos, cast, seasons and episodes, and where to watch (JustWatch data), with a link to open the title on your service.
- **Discover and search**: browsing with filters kept in the URL, followable topics, search across movies, series and people with related keywords.
- **Personal library**: watchlist, watched titles and ratings, custom lists shared by link, release reminders (notifications and `.ics`), episode tracking.
- **Play and tools**: a daily movie quiz with streaks and shareable results, badges and a year-in-review card, comparing two titles, and _Watch together_, where a group swipes through a shared link.
- **Interface**: light, dark and automatic themes, plus Liquid Glass (SVG refraction in Chromium browsers); infinite scroll; a mobile layout with a bottom tab bar.

## What's inside

| Area          | Tools                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| App           | React 19, Vite 8, React Router 8, TanStack Query 5, Zustand 5                                         |
| Design system | [Sen UI](https://github.com/ductmOfficial/sen-ui) tokens and components, Tailwind CSS 4, lucide icons |
| Edge          | Cloudflare Worker: TMDB proxy, edge cache, rate limit, link-preview metadata, sitemap                 |
| Shared code   | `@lumi/tmdb-client` (typed TMDB client), `@lumi/i18n` (Vietnamese and English messages)               |
| Testing       | Vitest; Playwright with axe (WCAG 2.2 AA, light and dark, desktop and mobile) on a fake TMDB          |
| CI            | GitHub Actions (`Verify`, `Browser`), protected `main`, Conventional Commits, Dependabot              |

## Structure

```
.
├── apps/
│   ├── web/                    # the React app (Vite); e2e/ holds the browser tests
│   └── worker/                 # Cloudflare Worker: serves apps/web/dist, proxies TMDB, adds SEO metadata
├── packages/
│   ├── tmdb-client/            # @lumi/tmdb-client: requests, errors, images, series normalized to the movie shape
│   ├── i18n/                   # @lumi/i18n: messages shared by the app and the Worker's metadata
│   ├── eslint-config/          # @repo/eslint-config
│   ├── prettier-config/        # @repo/prettier-config
│   └── typescript-config/      # @repo/typescript-config
└── turbo.json                  # task pipeline
```

Inside `apps/web/src`, each feature folder (`movies`, `tv`, `people`, `discover`, `search`, `personalization`, `library`, `play`, `compare`, `together`, `insights`, `settings`) keeps its pages, components, queries and pure logic together; the pure logic has unit tests next to it.

## Requirements

- Node.js 24 (`.nvmrc`)
- pnpm 12 (pinned in `packageManager`)
- A TMDB API Read Access Token for local development ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))

## Getting started

```bash
pnpm install
cp .env.example apps/web/.env      # set VITE_TMDB_ACCESS_TOKEN
pnpm build                         # builds the shared packages first
pnpm --filter web dev              # http://localhost:5173
```

The token is for local development only: in dev the app calls TMDB directly with it. Production builds never contain it (`vite.config.ts` strips it) and call the API through the Worker at `/api/tmdb`.

| Script                     | What it does                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm build`               | Build the packages and the app, and check the Worker bundle (`wrangler --dry-run`) |
| `pnpm lint`                | ESLint everywhere; warnings fail the run                                           |
| `pnpm typecheck`           | `tsc --noEmit` everywhere                                                          |
| `pnpm test`                | Vitest everywhere                                                                  |
| `pnpm --filter web e2e`    | Playwright and axe against the production build and a fake TMDB (after `build`)    |
| `pnpm --filter worker dev` | The whole site through the Worker, locally (after `build`)                         |

`e2e` uses Playwright's Chromium (`pnpm --filter web exec playwright install chromium`), or the browser in `CHROME_PATH`. It needs no token: the tests answer every TMDB request with fictional titles and placeholder images.

## Deployment (Cloudflare Workers)

One Worker (`apps/worker`) serves the app's build and proxies TMDB:

- keeps the token as a server-side secret, allows only `GET` and `HEAD`, and blocks account and session endpoints;
- caches at the edge per kind of data, from one hour to seven days, always far below TMDB's six-month limit;
- limits each IP to 120 TMDB requests per minute (`TMDB_LIMITER`);
- adds metadata to every page's HTML in the browser's language: title, description, canonical URL, Open Graph and Twitter cards with artwork, and JSON-LD (`Movie`, `TVSeries`, `Person`);
- serves `robots.txt` and `sitemap.xml` (main pages plus trending and popular titles and people, cached for a day).

```bash
pnpm --filter worker exec wrangler login
pnpm --filter worker exec wrangler secret put TMDB_TOKEN   # the API Read Access Token
pnpm build && pnpm --filter worker run deploy              # https://lumi.<subdomain>.workers.dev
```

To run the Worker locally, put `TMDB_TOKEN=...` in `apps/worker/.dev.vars` (ignored by git), then `pnpm --filter worker dev`.

## Design

- **Sen UI.** Buttons, selects, text fields and confirmation dialogs are Sen UI components. The palette of each theme lives in Sen UI's `--sen-*` tokens, and the app's short role names (`bg`, `surface`, `fg`, `muted`, `accent`…) alias them, so Tailwind utilities and Sen UI components follow the same theme. Sen UI sits below Tailwind utilities in the cascade layer order.
- **Themes** are defined in `apps/web/src/themes/*.css` and listed in `themes/registry.ts`. To add one, create `<id>.css` with a `[data-theme="<id>"]` block that sets the Sen UI color tokens, import it in `src/index.css` and add it to the registry.
- **Personalization** is rule-based (TMDB API Terms, section 1.C, forbid using TMDB data for machine learning or AI). Signals such as views, trailers, saves and likes stay in `localStorage`, and genre scores halve every 30 days. The logic is in `features/personalization/engine.ts`, with unit tests.

## Contributing workflow

1. Branch from `main`: `git switch -c feat/short-description`
2. Commit with [Conventional Commits](https://www.conventionalcommits.org); the `commit-msg` hook enforces it.
3. Open a PR with `gh pr create --fill-first`.
4. Merge with `gh pr merge --rebase --delete-branch` once `Verify` and `Browser` are green.

## Data and attribution

<a href="https://www.themoviedb.org"><img src="apps/web/public/tmdb-logo.svg" alt="TMDB" height="16"></a>

**This product uses the TMDB API but is not endorsed or certified by TMDB.** Movie, series and people data and images come from [The Movie Database (TMDB)](https://www.themoviedb.org) under the [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use). Watch-provider data comes from [JustWatch](https://www.justwatch.com). Streaming services and other third-party names and trademarks belong to their owners.

How the code follows the terms:

- The footer and Settings show the TMDB logo and notice; the where-to-watch section, the streaming row and the service picker credit JustWatch.
- Non-commercial, no ads, and no AI or machine learning on TMDB data.
- Data is cached for far less than six months (the edge keeps it at most seven days).
- The TMDB token lives only in the Worker's secrets, never in the browser bundle.

## License

[MIT](LICENSE)
