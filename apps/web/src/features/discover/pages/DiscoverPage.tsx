import { useState } from "react";
import clsx from "clsx";
import { ErrorState } from "@/components/ErrorState";
import { LoadMore } from "@/components/LoadMore";
import { MovieGrid, MovieGridSkeleton } from "@/components/MovieGrid";
import { PageMeta } from "@/components/PageMeta";
import { Sheet } from "@/components/Sheet";
import { ChevronLeftIcon, CloseIcon, FilterIcon } from "@/components/icons";
import { Link } from "react-router";
import { formatNumber } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  useDiscoverMovies,
  useGenres,
  useKeywordName,
  useWatchProviders,
  type DiscoverFilters as Filters,
} from "../api/queries";
import { FORMAT_LABEL, languageName, STATUS_LABEL, themeBySlug } from "../catalog";
import { FollowTopicButton } from "@/features/personalization/components/FollowTopicButton";
import { DiscoverFilters } from "../components/DiscoverFilters";
import { useDiscoverParams } from "../useDiscoverParams";

export function DiscoverPage() {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { filters, update, reset } = useDiscoverParams();
  const q = useDiscoverMovies(filters);
  const movies = q.data?.pages.flatMap((p) => p.results) ?? [];
  const total = q.data?.pages[0]?.total_results;
  const genres = useGenres(filters.media);
  const providers = useWatchProviders(filters.media);

  // Active filters → removable chips + an auto-generated title
  const chips: { key: string; label: string; patch: Partial<Filters>; inTitle?: boolean }[] = [];
  // show the name of at most 1 keyword (usually only 1 when coming from a detail page)
  const keywordName = useKeywordName(filters.keywords?.[0]);
  filters.keywords?.forEach((id, i) =>
    chips.push({
      key: `kw${id}`,
      label: `#${(i === 0 ? keywordName.data : undefined) ?? id}`,
      patch: { keywords: filters.keywords?.filter((k) => k !== id) },
      inTitle: true,
    }),
  );
  const theme = themeBySlug(filters.theme);
  if (theme)
    chips.push({ key: "theme", label: t(theme.label), patch: { theme: undefined }, inTitle: true });
  filters.genres.forEach((id) => {
    const name = genres.data?.find((g) => g.id === id)?.name;
    if (name)
      chips.push({
        key: `g${id}`,
        label: name,
        patch: { genres: filters.genres.filter((g) => g !== id) },
        inTitle: true,
      });
  });
  if (filters.lang)
    chips.push({
      key: "lang",
      label: languageName(filters.lang, locale),
      patch: { lang: undefined },
      inTitle: true,
    });
  if (filters.decade)
    chips.push({
      key: "decade",
      label: t("discover.decadeLabel", { n: filters.decade }),
      patch: { decade: undefined },
      inTitle: true,
    });
  if (filters.year)
    chips.push({
      key: "year",
      label: String(filters.year),
      patch: { year: undefined },
      inTitle: true,
    });
  const provider = providers.data?.find((p) => p.provider_id === filters.provider);
  if (filters.provider)
    chips.push({
      key: "provider",
      label: provider?.provider_name ?? `#${filters.provider}`,
      patch: { provider: undefined },
      inTitle: true,
    });
  if (filters.format)
    chips.push({
      key: "format",
      label: t(FORMAT_LABEL[filters.format]),
      patch: { format: undefined },
      inTitle: true,
    });
  if (filters.status)
    chips.push({
      key: "status",
      label: t(STATUS_LABEL[filters.status]),
      patch: { status: undefined },
      inTitle: true,
    });
  if (filters.minRating)
    chips.push({
      key: "rating",
      label: `★ ≥ ${filters.minRating}`,
      patch: { minRating: undefined },
    });
  const activeCount = chips.length + (filters.sort !== "popularity.desc" ? 1 : 0);

  const baseTitle = filters.media === "tv" ? t("discover.titleTv") : t("discover.title");
  const titleParts = chips.filter((c) => c.inTitle).map((c) => c.label);
  const title = titleParts.length ? titleParts.slice(0, 3).join(" · ") : baseTitle;

  const filterPanel = <DiscoverFilters filters={filters} onChange={update} onReset={reset} />;

  return (
    <div className="mx-auto max-w-app px-4 sm:px-6 py-6 sm:py-8">
      <PageMeta title={title} />
      <Link
        to="/discover"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ChevronLeftIcon size={16} />
        {t("hub.title")}
      </Link>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            {theme && <FollowTopicButton slug={theme.slug} />}
          </div>
          <p className="text-sm text-muted">
            {titleParts.length > 0 && (
              <span>{filters.media === "tv" ? t("search.tv") : t("search.movies")} · </span>
            )}
            {total !== undefined &&
              t(filters.media === "tv" ? "discover.totalTv" : "discover.total", {
                n: formatNumber(total, locale),
              })}
          </p>
        </div>
        {!isDesktop && (
          <button
            type="button"
            onClick={() => {
              setSheetOpen(true);
            }}
            className="relative inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-fg"
          >
            <FilterIcon size={16} />
            {t("discover.filters")}
            {activeCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-accent-fg">
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <ul className="mb-5 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => {
                  update(c.patch);
                }}
                aria-label={t("discover.removeFilter", { name: c.label })}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-3 pr-2 text-xs font-medium hover:border-fg"
              >
                {c.label}
                <CloseIcon size={14} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        {isDesktop && <aside className="lg:sticky lg:top-20 lg:self-start">{filterPanel}</aside>}
        <div className={clsx("min-w-0 transition-opacity", q.isPlaceholderData && "opacity-50")}>
          {q.isPending ? (
            <MovieGridSkeleton />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <>
              <MovieGrid movies={movies} />
              <LoadMore
                hasNextPage={q.hasNextPage && !q.isPlaceholderData}
                isFetchingNextPage={q.isFetchingNextPage}
                fetchNextPage={() => q.fetchNextPage()}
              />
            </>
          )}
        </div>
      </div>
      {!isDesktop && (
        <Sheet
          open={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
          }}
          title={t("discover.filters")}
          footer={
            <button
              type="button"
              onClick={() => {
                setSheetOpen(false);
              }}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-accent-fg"
            >
              {total !== undefined
                ? t("discover.showResults", { n: formatNumber(total, locale) })
                : t("common.close")}
            </button>
          }
        >
          {filterPanel}
        </Sheet>
      )}
    </div>
  );
}
