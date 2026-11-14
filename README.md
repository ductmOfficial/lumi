# Lumi

[![CI](https://github.com/ductmOfficial/lumi/actions/workflows/ci.yml/badge.svg)](https://github.com/ductmOfficial/lumi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A movie and series discovery app built on the TMDB API. Vietnamese and English, rule-based personalization (no AI or machine learning), and every bit of personal data stays in the browser.

> Live at [lumi.tmduc.workers.dev](https://lumi.tmduc.workers.dev). See [PROGRESS.md](PROGRESS.md).

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

## Setup

### 1. Prerequisites

| Tool                       | Version                    | Needed for                         | Install                                                                                            |
| -------------------------- | -------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Node.js                    | 24 (`.nvmrc`)              | everything                         | `nvm install && nvm use` (or `fnm use`)                                                            |
| pnpm                       | 12.14.0 (`packageManager`) | everything                         | `corepack enable` (or `npm install -g pnpm@12.14.0`)                                               |
| Git                        | any recent                 | everything                         |                                                                                                    |
| TMDB API Read Access Token | v4 token                   | running the app with real data     | Create a free account, then [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| Chromium or Google Chrome  | any recent                 | browser tests only                 | `pnpm --filter web exec playwright install chromium`, or point `CHROME_PATH` at Chrome             |
| Cloudflare account         | free plan is enough        | running the Worker locally, deploy | [dash.cloudflare.com](https://dash.cloudflare.com/sign-up)                                         |

`pnpm install` refuses other Node.js majors (`engineStrict`). Corepack ships with Node.js 24: after `corepack enable`, the first `pnpm` command downloads the exact version from `packageManager` (answer `Y` if it asks). The TMDB page shows two credentials: use the long **API Read Access Token** (it starts with `eyJ`), not the short API key.

### 2. Clone and install

```bash
git clone https://github.com/ductmOfficial/lumi.git
cd lumi
nvm use
corepack enable
pnpm install          # also installs the commit-msg hook
```

### 3. Configure the token

```bash
cp .env.example apps/web/.env
```

Then open `apps/web/.env` and set the token. The file is ignored by git.

| Variable                 | Required | Default                              | What it does                                                                                 |
| ------------------------ | -------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `VITE_TMDB_ACCESS_TOKEN` | for dev  | —                                    | TMDB API Read Access Token. With it, the dev server calls TMDB directly                      |
| `VITE_TMDB_API_BASE`     | no       | TMDB, or `/api/tmdb` without a token | Another API base, such as a deployed Worker: `https://lumi.<subdomain>.workers.dev/api/tmdb` |
| `VITE_TMDB_IMAGE_BASE`   | no       | `https://image.tmdb.org/t/p`         | Image CDN                                                                                    |

Without a token and without `VITE_TMDB_API_BASE`, the app calls `/api/tmdb` on its own origin, which only the Worker serves.

### 4. Build the shared packages

```bash
pnpm build
```

The app and the Worker import `@lumi/tmdb-client` and `@lumi/i18n` from their build output, so run this once after cloning and again after changing a package. It also builds the app and checks the Worker bundle.

## Running

### Development server

```bash
pnpm --filter web dev
```

Open http://localhost:5173. The server listens on every interface (`--host`), so a phone on the same network can open the address it prints; copying to the clipboard falls back to an older API there, because a LAN address is not a secure context.

### Production build, without the Worker

```bash
ALLOW_CLIENT_TOKEN=1 pnpm --filter web build
pnpm --filter web preview      # http://localhost:4173
```

A normal production build strips the token and calls `/api/tmdb`, which `vite preview` does not serve. `ALLOW_CLIENT_TOKEN=1` keeps the token in the bundle for this local check only; never deploy a build made with it.

### The whole site through the Worker

This is how the site runs in production: the Worker serves the build, proxies TMDB with the token as a secret, and adds link-preview metadata.

```bash
echo "TMDB_TOKEN=<your API Read Access Token>" > apps/worker/.dev.vars   # ignored by git
pnpm build
pnpm --filter worker dev       # http://localhost:8787
```

Check it from another terminal:

```bash
curl -s http://localhost:8787/api/tmdb/genre/movie/list | head -c 120
curl -s -H "Accept-Language: en" http://localhost:8787/movie/550 | grep -o '<meta property="og:title"[^>]*>'
```

Run `pnpm build` again after changing the app: the Worker serves `apps/web/dist`.

## Testing

| Command                                         | What it runs                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm test`                                     | Vitest in every package (pure logic, the TMDB client, the Worker, the messages) |
| `pnpm --filter @lumi/tmdb-client test:coverage` | The client's tests with the 90% coverage threshold                              |
| `pnpm lint` / `pnpm typecheck`                  | ESLint (warnings fail) and `tsc --noEmit` everywhere                            |
| `pnpm format:check` / `pnpm format`             | Prettier check / write                                                          |
| `pnpm --filter web e2e`                         | Playwright flows and axe (WCAG 2.2 AA) on desktop and mobile, light and dark    |

The browser tests need no token: they run against the production build (`pnpm build` first) and answer every TMDB request with fictional titles and placeholder images (`apps/web/e2e/fake-tmdb.ts`). They use Playwright's Chromium, or the browser in `CHROME_PATH`:

```bash
pnpm build
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" pnpm --filter web e2e
pnpm --filter web exec playwright test --project=desktop e2e/app.spec.ts   # a subset
```

To run what CI runs before opening a pull request:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm turbo run lint typecheck test build
pnpm --filter web e2e
```

| Script    | Where         | What it does                                                              |
| --------- | ------------- | ------------------------------------------------------------------------- |
| `dev`     | `web`         | Vite dev server                                                           |
| `build`   | every package | `web`: Vite build; `worker`: `wrangler deploy --dry-run`; packages: `tsc` |
| `preview` | `web`         | Serve the last build                                                      |
| `e2e`     | `web`         | Playwright and axe                                                        |
| `dev`     | `worker`      | `wrangler dev` with the app's build                                       |
| `deploy`  | `worker`      | `wrangler deploy` (run it as `pnpm --filter worker run deploy`)           |

## Deployment (Cloudflare Workers)

One Worker (`apps/worker`) serves the app's build and proxies TMDB:

- keeps the token as a server-side secret, allows only `GET` and `HEAD`, and blocks account and session endpoints;
- caches at the edge per kind of data, from one hour to seven days, always far below TMDB's six-month limit;
- limits each IP to 120 TMDB requests per minute (`TMDB_LIMITER`);
- adds metadata to every page's HTML in the browser's language: title, description, canonical URL, Open Graph and Twitter cards with artwork, and JSON-LD (`Movie`, `TVSeries`, `Person`);
- serves `robots.txt` and `sitemap.xml` (main pages plus trending and popular titles and people, cached for a day).

First deploy:

```bash
pnpm --filter worker exec wrangler login
pnpm --filter worker exec wrangler whoami                  # the account to deploy to
pnpm --filter worker exec wrangler secret put TMDB_TOKEN   # paste the API Read Access Token
pnpm install --frozen-lockfile && pnpm build
pnpm --filter worker run deploy                            # https://lumi.<subdomain>.workers.dev
```

Later deploys need only the last two lines; the secret stays. Before deploying under another name or subdomain, change `name` and `vars.SITE_URL` in `apps/worker/wrangler.jsonc`: `SITE_URL` is the canonical origin in the metadata, `robots.txt` and the sitemap.

Check a deploy:

```bash
curl -sI https://lumi.<subdomain>.workers.dev/                 # 200, Vary: Accept-Language
curl -s https://lumi.<subdomain>.workers.dev/api/tmdb/genre/movie/list | head -c 120
curl -s https://lumi.<subdomain>.workers.dev/robots.txt
pnpm --filter worker exec wrangler deployments list
```

## Troubleshooting

| Symptom                                                               | Fix                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm install` fails with `ERR_PNPM_UNSUPPORTED_ENGINE`               | Wrong Node.js major: `nvm use` (Node.js 24), then install again                                                    |
| `pnpm: command not found`, or a different pnpm version runs           | `corepack enable`, then open a new terminal; `pnpm -v` should print `12.14.0`                                      |
| "Missing VITE_TMDB_ACCESS_TOKEN" on every page                        | Create `apps/web/.env` from `.env.example` and restart the dev server                                              |
| TMDB answers 401                                                      | The value is the short API key or has expired; use the API Read Access Token                                       |
| Vite or TypeScript cannot resolve `@lumi/tmdb-client` or `@lumi/i18n` | Run `pnpm build` once: the packages are imported from their build output                                           |
| `vite preview` shows no data                                          | The production build has no token; build with `ALLOW_CLIENT_TOKEN=1`, or run the Worker                            |
| The Worker answers 500 "TMDB_TOKEN is not configured"                 | Locally: `apps/worker/.dev.vars`; deployed: `wrangler secret put TMDB_TOKEN`                                       |
| The Worker serves an old version of the app                           | `pnpm build` again before `pnpm --filter worker dev` or `run deploy`                                               |
| Port 5173, 4173 or 8787 is taken                                      | `pnpm --filter web dev --port 5174`, `pnpm --filter worker dev --port 8788` (the browser tests need 4173)          |
| The commit is rejected                                                | The hook enforces [Conventional Commits](https://www.conventionalcommits.org): `feat(web): …`, `fix(worker): …`, … |
| The browser tests cannot find a browser                               | `pnpm --filter web exec playwright install chromium`, or set `CHROME_PATH`                                         |
| A machine with little memory kills the run (exit code 137)            | Run fewer tasks at once: `pnpm turbo run lint typecheck test build --concurrency=2`                                |

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
