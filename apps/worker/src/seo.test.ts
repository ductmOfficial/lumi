import { describe, expect, it } from "vitest";
import {
  defaultMeta,
  documentTitle,
  headTags,
  titlePath,
  matchRoute,
  personMeta,
  pickLocale,
  robotsTxt,
  sharedListMeta,
  sitemapXml,
  staticMeta,
  t,
  titleMeta,
  truncate,
} from "./seo";

const SITE = "https://lumi.example";
const route = (path: string) => matchRoute(new URL(SITE + path));

describe("matchRoute", () => {
  it("parses detail pages with or without slug and tab", () => {
    expect(route("/movie/550-fight-club")).toEqual({ kind: "movie", id: 550 });
    expect(route("/tv/1399-game-of-thrones/seasons/2")).toEqual({ kind: "tv", id: 1399 });
    expect(route("/person/287")).toEqual({ kind: "person", id: 287 });
    expect(route("/movie/not-a-number")).toBeNull();
  });

  it("parses compare and shared list links, ignoring junk", () => {
    expect(route("/compare?a=movie-1&b=tv-2")).toEqual({
      kind: "compare",
      a: { type: "movie", id: 1 },
      b: { type: "tv", id: 2 },
    });
    expect(route("/compare?a=nope")).toEqual({ kind: "compare", a: undefined, b: undefined });
    expect(route("/lists/shared?n=Weekend&i=m1.x9.t2")).toEqual({
      kind: "sharedList",
      name: "Weekend",
      items: [
        { type: "movie", id: 1 },
        { type: "tv", id: 2 },
      ],
    });
    expect(route("/settings")).toBeNull();
  });
});

describe("locale", () => {
  it("uses Vietnamese only when the browser asks for it first", () => {
    expect(pickLocale("vi-VN,vi;q=0.9,en;q=0.8")).toBe("vi");
    expect(pickLocale("en-US,vi;q=0.5")).toBe("en");
    expect(pickLocale(null)).toBe("en");
  });

  it("fills message parameters", () => {
    expect(t("en", "og.sharedListDesc", { n: 3, titles: "A, B" })).toBe("3 movies & series: A, B");
  });
});

describe("truncate", () => {
  it("cuts on a word boundary with an ellipsis", () => {
    const out = truncate("word ".repeat(80), 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("word…")).toBe(true);
    expect(truncate("  short   text ")).toBe("short text");
  });
});

describe("page metadata", () => {
  it("builds movie metadata with a canonical slug URL and JSON-LD", () => {
    const meta = titleMeta(
      "movie",
      {
        id: 550,
        title: "Fight Club",
        overview: "An insomniac office worker…",
        release_date: "1999-10-15",
        backdrop_path: "/b.jpg",
        poster_path: "/p.jpg",
        vote_average: 8.438,
        vote_count: 30000,
        runtime: 139,
        genres: [{ name: "Drama" }],
      },
      SITE,
      "en",
    );
    expect(meta).toMatchObject({
      title: "Fight Club (1999)",
      url: `${SITE}/movie/550-fight-club`,
      type: "video.movie",
      image: "https://image.tmdb.org/t/p/w1280/b.jpg",
    });
    expect(meta.jsonLd).toMatchObject({
      "@type": "Movie",
      duration: "PT139M",
      aggregateRating: { ratingValue: 8.4, ratingCount: 30000 },
    });
  });

  it("falls back to a generic description and skips ratings with few votes", () => {
    const meta = titleMeta(
      "tv",
      { id: 1, name: "Show", vote_average: 9, vote_count: 3 },
      SITE,
      "en",
    );
    expect(meta.title).toBe("Show");
    expect(meta.description).toContain("Show");
    expect(meta.jsonLd).not.toHaveProperty("aggregateRating");
  });

  it("builds person and shared-list metadata", () => {
    expect(
      personMeta({ id: 287, name: "Brad Pitt", profile_path: "/x.jpg" }, SITE, "en"),
    ).toMatchObject({ type: "profile", url: `${SITE}/person/287-brad-pitt` });
    const list = sharedListMeta(
      "Weekend",
      [
        { id: 1, title: "A" },
        { id: 2, name: "B" },
      ],
      5,
      `${SITE}/lists/shared?n=Weekend`,
      "en",
    );
    expect(list.title).toBe("Weekend — a list on Lumi");
    expect(list.description).toBe("5 movies & series: A, B");
    expect(documentTitle(list)).toBe("Weekend — a list on Lumi");
    expect(documentTitle(staticMeta("play", SITE, "en"))).toBe("Movie quiz · Lumi");
    expect(staticMeta("home", SITE, "en").url).toBe(`${SITE}/`);
    expect(defaultMeta(SITE, "/discover/browse", "vi")).toMatchObject({
      title: "Lumi",
      url: `${SITE}/discover/browse`,
      locale: "vi",
    });
  });
});

describe("canonical URLs", () => {
  it("use the English slug in every language, and no slug for non-Latin names", () => {
    const vi = titleMeta(
      "movie",
      { id: 550, title: "El club de la lucha" },
      SITE,
      "vi",
      "Fight Club",
    );
    expect(vi.url).toBe(`${SITE}/movie/550-fight-club`);
    expect(vi.title).toBe("El club de la lucha");
    expect(titlePath("tv", 7, "孤独のグルメ")).toBe("/tv/7");
  });
});

describe("head tags", () => {
  it("escapes attributes and keeps JSON-LD from closing the script tag", () => {
    const html = headTags(
      {
        title: 'A "quoted" <title>',
        description: "x",
        url: SITE,
        type: "website",
        locale: "vi",
        jsonLd: { name: "</script><script>alert(1)</script>" },
      },
      `${SITE}/og-default.png`,
    );
    expect(html).toContain('content="A &quot;quoted&quot; &lt;title&gt;"');
    expect(html).toContain(`content="${SITE}/og-default.png"`);
    expect(html).toContain('og:locale" content="vi_VN"');
    expect(html).not.toContain("</script><script>");
  });
});

describe("robots & sitemap", () => {
  it("points crawlers at the sitemap and keeps them out of the API", () => {
    expect(robotsTxt(SITE)).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(robotsTxt(SITE)).toContain("Disallow: /api/");
  });

  it("deduplicates entries and escapes URLs", () => {
    const xml = sitemapXml(SITE, [
      { path: "/a?x=1&y=2" },
      { path: "/a?x=1&y=2" },
      { path: "/", priority: 1 },
    ]);
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).toContain("/a?x=1&amp;y=2");
    expect(xml).toContain("<priority>1.0</priority>");
  });
});
