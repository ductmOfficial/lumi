import {
  handleTmdb,
  jsonError,
  PROXY_PREFIX,
  type EdgeCache,
  type ProxyDeps,
  type RateLimiter,
} from "./tmdbProxy";
import {
  compareMeta,
  defaultMeta,
  documentTitle,
  headTags,
  matchRoute,
  personMeta,
  pickLocale,
  robotsTxt,
  sharedListMeta,
  sitemapXml,
  STATIC_PAGES,
  staticMeta,
  titleMeta,
  titlePath,
  tmdbLanguage,
  type Locale,
  type MetaRoute,
  type PageMeta,
  type PersonData,
  type SitemapEntry,
  type TitleData,
} from "./seo";

export interface Env {
  /** Static assets (the Vite build in dist/) */
  ASSETS: Fetcher;
  /** TMDB API Read Access Token — set with `wrangler secret put TMDB_TOKEN` */
  TMDB_TOKEN?: string;
  /** Optional Rate Limiting binding, declared in wrangler.jsonc */
  TMDB_LIMITER?: RateLimiter;
  /** Canonical origin, e.g. https://lumi.tmduc.workers.dev (falls back to the request origin) */
  SITE_URL?: string;
}

/** Metadata lookups must never hold the page back for long */
const META_TIMEOUT_MS = 2500;
const SITEMAP_TTL = 24 * 60 * 60;

const edgeCache = () => caches.default as unknown as EdgeCache;

function proxyDeps(request: Request, env: Env, ctx: ExecutionContext): ProxyDeps {
  return {
    token: env.TMDB_TOKEN,
    fetch: (input, init) => fetch(input, init),
    cache: edgeCache(),
    limiter: env.TMDB_LIMITER,
    clientKey: request.headers.get("CF-Connecting-IP") ?? "unknown",
    waitUntil: (p) => {
      ctx.waitUntil(p);
    },
  };
}

/** Internal TMDB reads go through the same proxy logic (and edge cache), without the per-IP limiter */
function tmdbReader(request: Request, env: Env, ctx: ExecutionContext) {
  const origin = new URL(request.url).origin;
  const deps = { ...proxyDeps(request, env, ctx), limiter: undefined };
  return async <T>(path: string, params: Record<string, string> = {}): Promise<T | undefined> => {
    const url = new URL(origin + PROXY_PREFIX + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await handleTmdb(new Request(url), deps);
    return res.ok ? res.json<T>() : undefined;
  };
}

type Reader = ReturnType<typeof tmdbReader>;

async function buildMeta(
  route: MetaRoute,
  url: URL,
  site: string,
  locale: Locale,
  read: Reader,
): Promise<PageMeta | null> {
  const language = tmdbLanguage(locale);
  const pageUrl = site + url.pathname + url.search;
  switch (route.kind) {
    case "movie":
    case "tv": {
      // the English record gives the canonical slug (and is shared with English visitors' cache)
      const [data, english] = await Promise.all([
        read<TitleData>(`/${route.kind}/${route.id}`, { language }),
        locale === "en"
          ? Promise.resolve(undefined)
          : read<TitleData>(`/${route.kind}/${route.id}`, { language: "en-US" }),
      ]);
      return data
        ? titleMeta(route.kind, data, site, locale, english?.title ?? english?.name)
        : null;
    }
    case "person": {
      const [data, english] = await Promise.all([
        read<PersonData>(`/person/${route.id}`, { language }),
        locale === "en"
          ? Promise.resolve(undefined)
          : read<PersonData>(`/person/${route.id}`, { language: "en-US" }),
      ]);
      if (!data) return null;
      // biographies are often English-only
      if (!data.biography && english?.biography) data.biography = english.biography;
      return personMeta(data, site, locale, english?.name);
    }
    case "compare": {
      const [a, b] = await Promise.all(
        [route.a, route.b].map((ref) =>
          ref
            ? read<TitleData>(`/${ref.type}/${ref.id}`, { language })
            : Promise.resolve(undefined),
        ),
      );
      return compareMeta(a, b, pageUrl, locale);
    }
    case "sharedList": {
      const first = await Promise.all(
        route.items
          .slice(0, 3)
          .map((ref) => read<TitleData>(`/${ref.type}/${ref.id}`, { language })),
      );
      return sharedListMeta(
        route.name,
        first.filter((d): d is TitleData => !!d),
        route.items.length,
        pageUrl,
        locale,
      );
    }
    default:
      return staticMeta(route.kind, site, locale);
  }
}

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([
    promise,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        resolve(null);
      }, ms),
    ),
  ]);

/** Serves the SPA shell with page-specific <title>, description, Open Graph tags and JSON-LD. */
async function renderPage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const page = await env.ASSETS.fetch(request);
  if (!(page.headers.get("Content-Type") ?? "").includes("text/html")) return page;

  const url = new URL(request.url);
  const route = matchRoute(url);
  const site = (env.SITE_URL ?? url.origin).replace(/\/$/, "");
  const locale = pickLocale(request.headers.get("Accept-Language"));

  let meta: PageMeta | null = null;
  if (route) {
    try {
      meta = await withTimeout(
        buildMeta(route, url, site, locale, tmdbReader(request, env, ctx)),
        META_TIMEOUT_MS,
      );
    } catch {
      meta = null;
    }
  }
  // unknown route, TMDB miss or timeout: still give the page site-wide preview tags
  meta ??= defaultMeta(site, url.pathname, locale);

  const resolved = meta;
  const rewritten = new HTMLRewriter()
    .on("html", { element: (el) => void el.setAttribute("lang", locale) })
    .on("title", { element: (el) => void el.setInnerContent(documentTitle(resolved)) })
    .on('meta[name="description"]', {
      element: (el) => void el.setAttribute("content", resolved.description),
    })
    .on("head", {
      element: (el) => void el.append(headTags(resolved, `${site}/og-default.png`), { html: true }),
    })
    .transform(page);
  const res = new Response(rewritten.body, rewritten);
  res.headers.append("Vary", "Accept-Language");
  return res;
}

interface Listing {
  results: (TitleData & { media_type?: string })[];
}

async function sitemap(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const site = (env.SITE_URL ?? url.origin).replace(/\/$/, "");
  const cache = edgeCache();
  const key = `${url.origin}/sitemap.xml`;
  const cached = await cache.match(key);
  if (cached) return cached;

  const read = tmdbReader(request, env, ctx);
  // English titles give the most stable, readable slugs
  const lists = await Promise.all([
    read<Listing>("/trending/movie/week", { language: "en-US" }),
    read<Listing>("/trending/tv/week", { language: "en-US" }),
    read<Listing>("/movie/popular", { language: "en-US" }),
    read<Listing>("/tv/popular", { language: "en-US" }),
    read<{ results: PersonData[] }>("/trending/person/week", { language: "en-US" }),
  ]);
  const [trendingMovies, trendingTv, popularMovies, popularTv, people] = lists;
  const titles = (kind: "movie" | "tv", list?: Listing): SitemapEntry[] =>
    (list?.results ?? []).map((d) => ({
      path: titlePath(kind, d.id, d.title ?? d.name ?? ""),
      changefreq: "weekly",
      priority: 0.6,
    }));
  const entries: SitemapEntry[] = [
    ...STATIC_PAGES,
    ...titles("movie", trendingMovies),
    ...titles("tv", trendingTv),
    ...titles("movie", popularMovies),
    ...titles("tv", popularTv),
    ...(people?.results ?? []).map((p) => ({
      path: titlePath("person", p.id, p.name),
      changefreq: "monthly" as const,
      priority: 0.4,
    })),
  ];
  const res = new Response(sitemapXml(site, entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=3600, s-maxage=${SITEMAP_TTL}`,
    },
  });
  // only cache a sitemap that actually contains titles
  if (entries.length > STATIC_PAGES.length) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith(PROXY_PREFIX + "/"))
      return handleTmdb(request, proxyDeps(request, env, ctx));
    if (pathname.startsWith("/api/")) return jsonError(404, "Not found");

    if (pathname === "/robots.txt") {
      const site = (env.SITE_URL ?? url.origin).replace(/\/$/, "");
      return new Response(robotsTxt(site), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    if (pathname === "/sitemap.xml") return sitemap(request, env, ctx);

    // HTML routes (see run_worker_first) get server-side metadata; static files never reach the Worker
    if (request.method === "GET") return renderPage(request, env, ctx);
    // HEAD gets the same status and headers as GET (Vary, Content-Type…), without the body
    if (request.method === "HEAD") {
      const page = await renderPage(new Request(request, { method: "GET" }), env, ctx);
      return new Response(null, page);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
