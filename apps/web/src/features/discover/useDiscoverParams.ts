import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { sortOptionsFor, type DiscoverFilters, type SortOption } from "./api/queries";
import {
  isDecade,
  isLanguage,
  themeBySlug,
  TV_FORMAT,
  TV_STATUS,
  type TvFormat,
  type TvStatus,
} from "./catalog";

const toInt = (v: string | null) => {
  const n = Number(v);
  return v && Number.isFinite(n) ? n : undefined;
};

/** Discover filters live in the URL → shareable links, back/forward work correctly. */
export function useDiscoverParams() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<DiscoverFilters>(() => {
    const sort = params.get("sort");
    const lang = params.get("lang");
    const media: DiscoverFilters["media"] = params.get("type") === "tv" ? "tv" : "movie";
    return {
      media,
      genres: (params.get("genres") ?? "")
        .split(",")
        .map(Number)
        .filter((n) => n > 0),
      year: toInt(params.get("year")),
      minRating: toInt(params.get("rating")),
      sort: (sortOptionsFor(media) as readonly string[]).includes(sort ?? "")
        ? (sort as SortOption)
        : "popularity.desc",
      lang: isLanguage(lang) ? lang : undefined,
      decade: isDecade(toInt(params.get("decade"))) ? toInt(params.get("decade")) : undefined,
      theme: themeBySlug(params.get("theme") ?? undefined)?.slug,
      provider: toInt(params.get("provider")),
      keywords: (params.get("kw") ?? "")
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
      status:
        media === "tv" && (params.get("status") ?? "") in TV_STATUS
          ? (params.get("status") as TvStatus)
          : undefined,
      format:
        media === "tv" && (params.get("format") ?? "") in TV_FORMAT
          ? (params.get("format") as TvFormat)
          : undefined,
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<DiscoverFilters>) => {
      const next = { ...filters, ...patch };
      // switching movie ↔ series: genres & sorting differ → clear them
      if (patch.media && patch.media !== filters.media) {
        next.genres = [];
        next.sort = "popularity.desc";
      }
      // a specific year and a decade are mutually exclusive
      if (patch.year) next.decade = undefined;
      if (patch.decade) next.year = undefined;
      const sp = new URLSearchParams();
      if (next.media === "tv") sp.set("type", "tv");
      if (next.genres.length) sp.set("genres", next.genres.join(","));
      if (next.year) sp.set("year", String(next.year));
      if (next.minRating) sp.set("rating", String(next.minRating));
      if (next.sort !== "popularity.desc") sp.set("sort", next.sort);
      if (next.lang) sp.set("lang", next.lang);
      if (next.decade) sp.set("decade", String(next.decade));
      if (next.theme) sp.set("theme", next.theme);
      if (next.provider) sp.set("provider", String(next.provider));
      if (next.keywords?.length) sp.set("kw", next.keywords.join(","));
      if (next.media === "tv" && next.status) sp.set("status", next.status);
      if (next.media === "tv" && next.format) sp.set("format", next.format);
      setParams(sp, { replace: true });
    },
    [filters, setParams],
  );

  const reset = useCallback(() => {
    setParams(
      filters.media === "tv" ? new URLSearchParams({ type: "tv" }) : new URLSearchParams(),
      { replace: true },
    );
  }, [filters.media, setParams]);

  return { filters, update, reset };
}
