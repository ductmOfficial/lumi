/**
 * Server-side metadata for link previews (Open Graph / Twitter cards) and search engines.
 * Pure functions only — the Worker fetches TMDB data and injects the result with HTMLRewriter.
 */
import { dictionaries, localeFor, type Locale, type MessageKey } from "@lumi/i18n";
import { slugify, TMDB_IMAGE_BASE as IMAGE_BASE } from "@lumi/tmdb-client";

export type { Locale };

export const SITE_NAME = "Lumi";

/** The visitor's first preferred language decides, as in the app (see localeFor). */
export function pickLocale(acceptLanguage: string | null): Locale {
  return localeFor(acceptLanguage);
}

export const tmdbLanguage = (locale: Locale) => (locale === "vi" ? "vi-VN" : "en-US");

export function t(
  locale: Locale,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const template: string = dictionaries[locale][key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
  type: "website" | "video.movie" | "video.tv_show" | "profile";
  locale: Locale;
  jsonLd?: Record<string, unknown>;
}

/** Routes that get server-rendered metadata */
export type MetaRoute =
  | { kind: "movie" | "tv" | "person"; id: number }
  | {
      kind: "compare";
      a?: { type: "movie" | "tv"; id: number };
      b?: { type: "movie" | "tv"; id: number };
    }
  | { kind: "sharedList"; name: string; items: { type: "movie" | "tv"; id: number }[] }
  | { kind: "together" | "play" | "home" };

const mediaRef = (value: string | null) => {
  const m = /^(movie|tv)-(\d+)$/.exec(value ?? "");
  return m ? { type: m[1] as "movie" | "tv", id: Number(m[2]) } : undefined;
};

export function matchRoute(url: URL): MetaRoute | null {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const detail = /^\/(movie|tv|person)\/(\d+)(?:-[^/]*)?(?:\/.*)?$/.exec(path);
  if (detail) return { kind: detail[1] as "movie" | "tv" | "person", id: Number(detail[2]) };
  if (path === "/") return { kind: "home" };
  if (path === "/compare")
    return {
      kind: "compare",
      a: mediaRef(url.searchParams.get("a")),
      b: mediaRef(url.searchParams.get("b")),
    };
  if (path === "/together") return { kind: "together" };
  if (path === "/play") return { kind: "play" };
  if (path === "/lists/shared") {
    const items = (url.searchParams.get("i") ?? "")
      .split(".")
      .map((part) => /^([mt])(\d+)$/.exec(part))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => ({ type: m[1] === "m" ? ("movie" as const) : ("tv" as const), id: Number(m[2]) }))
      .slice(0, 50);
    return { kind: "sharedList", name: (url.searchParams.get("n") ?? "").slice(0, 80), items };
  }
  return null;
}

/** Shortens text on a word boundary for meta descriptions */
export function truncate(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6)).replace(/[\s,.;:–-]+$/, "") + "…";
}

export const imageUrl = (path: string | null | undefined, size: string) =>
  path ? `${IMAGE_BASE}/${size}${path}` : undefined;

/** Minimal TMDB shapes used for metadata */
export interface TitleData {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  tagline?: string;
  release_date?: string;
  first_air_date?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  runtime?: number | null;
  number_of_seasons?: number;
  genres?: { name: string }[];
}

export interface PersonData {
  id: number;
  name: string;
  biography?: string;
  profile_path?: string | null;
  known_for_department?: string;
  birthday?: string | null;
}

const year = (date?: string) => (date ? date.slice(0, 4) : "");
const titleOf = (d: TitleData) => d.title ?? d.name ?? "";

export function titleMeta(
  kind: "movie" | "tv",
  d: TitleData,
  site: string,
  locale: Locale,
  englishName = titleOf(d),
): PageMeta {
  const name = titleOf(d);
  const date = kind === "movie" ? d.release_date : d.first_air_date;
  const y = year(date);
  const url = site + titlePath(kind, d.id, englishName);
  const image = imageUrl(d.backdrop_path, "w1280") ?? imageUrl(d.poster_path, "w780");
  const description = truncate(
    d.overview || d.tagline || t(locale, "og.titleFallback", { title: name }),
  );
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": kind === "movie" ? "Movie" : "TVSeries",
    name,
    url,
    description,
    ...(imageUrl(d.poster_path, "w780") && { image: imageUrl(d.poster_path, "w780") }),
    ...(date && { [kind === "movie" ? "datePublished" : "startDate"]: date }),
    ...(d.genres?.length && { genre: d.genres.map((g) => g.name) }),
    ...(kind === "movie" && d.runtime && { duration: `PT${d.runtime}M` }),
    ...(kind === "tv" && d.number_of_seasons && { numberOfSeasons: d.number_of_seasons }),
    ...(d.vote_count && d.vote_count >= 10 && d.vote_average
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(d.vote_average * 10) / 10,
            bestRating: 10,
            ratingCount: d.vote_count,
          },
        }
      : {}),
  };
  return {
    title: y ? `${name} (${y})` : name,
    description,
    url,
    image,
    type: kind === "movie" ? "video.movie" : "video.tv_show",
    locale,
    jsonLd,
  };
}

export function personMeta(
  d: PersonData,
  site: string,
  locale: Locale,
  englishName = d.name,
): PageMeta {
  const url = site + titlePath("person", d.id, englishName);
  const description = truncate(d.biography || t(locale, "og.personFallback", { name: d.name }));
  return {
    title: d.name,
    description,
    url,
    image: imageUrl(d.profile_path, "h632"),
    type: "profile",
    locale,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: d.name,
      url,
      description,
      ...(imageUrl(d.profile_path, "h632") && { image: imageUrl(d.profile_path, "h632") }),
      ...(d.birthday && { birthDate: d.birthday }),
      ...(d.known_for_department && { jobTitle: d.known_for_department }),
    },
  };
}

export function compareMeta(
  a: TitleData | undefined,
  b: TitleData | undefined,
  url: string,
  locale: Locale,
): PageMeta {
  const title = a && b ? `${titleOf(a)} vs ${titleOf(b)}` : t(locale, "cmp.title");
  return {
    title,
    description: t(locale, "cmp.subtitle"),
    url,
    image: imageUrl(a?.backdrop_path, "w1280") ?? imageUrl(b?.backdrop_path, "w1280"),
    type: "website",
    locale,
  };
}

export function sharedListMeta(
  name: string,
  items: TitleData[],
  total: number,
  url: string,
  locale: Locale,
): PageMeta {
  const titles = items.slice(0, 3).map(titleOf).filter(Boolean).join(", ");
  return {
    title: name ? t(locale, "og.sharedListTitle", { name }) : t(locale, "lib.sharedList"),
    description: titles
      ? t(locale, "og.sharedListDesc", { n: total, titles })
      : t(locale, "og.siteDescription"),
    url,
    image: imageUrl(items[0]?.backdrop_path, "w1280") ?? imageUrl(items[0]?.poster_path, "w780"),
    type: "website",
    locale,
  };
}

export function staticMeta(
  kind: "together" | "play" | "home",
  site: string,
  locale: Locale,
): PageMeta {
  const map = {
    home: { path: "/", title: SITE_NAME, description: t(locale, "og.siteDescription") },
    together: {
      path: "/together",
      title: t(locale, "tg.title"),
      description: t(locale, "tg.subtitle"),
    },
    play: {
      path: "/play",
      title: t(locale, "game.title"),
      description: t(locale, "game.subtitle"),
    },
  }[kind];
  return {
    title: map.title,
    description: map.description,
    url: site + map.path,
    type: "website",
    locale,
  };
}

/** Any other app page: site-wide description, canonical URL without the query string */
export function defaultMeta(site: string, path: string, locale: Locale): PageMeta {
  return {
    title: SITE_NAME,
    description: t(locale, "og.siteDescription"),
    url: site + path,
    type: "website",
    locale,
  };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Full document title, matching the client-side PageMeta format */
export const documentTitle = (meta: PageMeta) =>
  meta.title.includes(SITE_NAME) ? meta.title : `${meta.title} · ${SITE_NAME}`;

/** Tags appended to <head>. JSON-LD is escaped so it cannot close the script tag. */
export function headTags(meta: PageMeta, defaultImage: string): string {
  const image = meta.image ?? defaultImage;
  const tags = [
    `<link rel="canonical" href="${escapeHtml(meta.url)}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:locale" content="${meta.locale === "vi" ? "vi_VN" : "en_US"}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
  ];
  if (meta.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c")}</script>`,
    );
  }
  return tags.join("\n    ");
}

export function robotsTxt(site: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${site}/sitemap.xml`,
    "",
  ].join("\n");
}

export interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: number;
}

export function sitemapXml(site: string, entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const urls = entries
    .filter((e) => !seen.has(e.path) && seen.add(e.path))
    .map(
      (e) =>
        `  <url><loc>${escapeHtml(site + e.path)}</loc>${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}${
          e.priority !== undefined ? `<priority>${e.priority.toFixed(1)}</priority>` : ""
        }</url>`,
    );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export const STATIC_PAGES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: 1 },
  { path: "/movies", changefreq: "daily", priority: 0.8 },
  { path: "/series", changefreq: "daily", priority: 0.8 },
  { path: "/discover", changefreq: "weekly", priority: 0.7 },
  { path: "/play", changefreq: "daily", priority: 0.5 },
  { path: "/together", changefreq: "monthly", priority: 0.4 },
  { path: "/compare", changefreq: "monthly", priority: 0.4 },
];

/**
 * Canonical path of a detail page. The slug always comes from the English name so every
 * language shares one canonical URL (matching the sitemap); no slug if the name has no Latin characters.
 */
export function titlePath(
  kind: "movie" | "tv" | "person",
  id: number,
  englishName: string,
): string {
  const slug = slugify(englishName);
  return slug ? `/${kind}/${id}-${slug}` : `/${kind}/${id}`;
}
