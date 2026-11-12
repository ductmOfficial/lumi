import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { tmdbFetch, type MovieSummary, type Paginated } from "@/lib/tmdb";
import { useT } from "@/i18n/useT";
import type { MessageKey } from "@lumi/i18n";
import { useTmdbLocale } from "@/stores/preferences";
import { PageMeta } from "@/components/PageMeta";
import { ErrorState } from "@/components/ErrorState";
import { trendingMoviesQuery } from "@/features/movies/api/queries";
import { tvList } from "@/features/tv/api";
import { usePersonalization } from "@/features/personalization/store";
import { useAffinity, useGenreNames } from "@/features/personalization/hooks";
import type { SignalType } from "@/features/personalization/types";
import {
  activityByDay,
  affinityTop,
  average,
  decadeStats,
  genreBreakdown,
  recentShare,
} from "../stats";
import { YourYear } from "../components/YourYear";
import { BarList, ChartCard, ColumnChart, DataTable, Legend, StatTile } from "../components/Charts";

const TOP_RATED_PAGES = [1, 2, 3];
const TYPE_LABEL: Partial<Record<SignalType, MessageKey>> = {
  view: "insights.type.view",
  trailer: "insights.type.trailer",
  watchlist: "insights.type.watchlist",
  like: "insights.type.like",
  dislike: "insights.type.dislike",
};

function Skeleton({ h = "h-64" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-2xl bg-surface`} />;
}

export function InsightsPage() {
  const t = useT();
  const { language, locale } = useTmdbLocale();
  const [now] = useState(() => new Date());
  const genreNames = useGenreNames();
  const genreName = (id: number) => genreNames.get(id) ?? `#${id}`;

  // ---- TMDB data
  const trendingMovies = useQuery(trendingMoviesQuery("week", language));
  const trendingTv = useQuery({
    queryKey: ["insights", "trending-tv", language],
    queryFn: ({ signal }) => tvList("/trending/tv/week", { language }, signal),
  });
  const onAir = useQuery({
    queryKey: ["insights", "on-air", language],
    queryFn: ({ signal }) => tvList("/tv/on_the_air", { language }, signal),
  });
  const topRated = useQueries({
    queries: TOP_RATED_PAGES.map((page) => ({
      queryKey: ["insights", "top-rated", language, page],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        tmdbFetch<Paginated<MovieSummary>>("/movie/top_rated", { language, page }, signal),
    })),
  });

  const trending = useMemo(
    () => [...(trendingMovies.data?.results ?? []), ...(trendingTv.data?.results ?? [])],
    [trendingMovies.data, trendingTv.data],
  );
  const genres = useMemo(() => genreBreakdown(trending, 10), [trending]);
  const topRatedItems = useMemo(() => topRated.flatMap((q) => q.data?.results ?? []), [topRated]);
  const decades = useMemo(() => decadeStats(topRatedItems), [topRatedItems]);
  const trendsLoading = trendingMovies.isPending || trendingTv.isPending;
  const trendsError = trendingMovies.error ?? trendingTv.error;

  // ---- personal data (localStorage)
  const events = usePersonalization((s) => s.events);
  const history = usePersonalization((s) => s.history);
  const watchlist = usePersonalization((s) => s.watchlist);
  const reactions = usePersonalization((s) => s.reactions);
  const aff = useAffinity();
  const taste = useMemo(() => affinityTop(aff, 8), [aff]);
  const activity = useMemo(() => activityByDay(events, now, 30), [events, now]);
  const likes = Object.values(reactions).filter((r) => r.reaction === "like").length;
  const hasPersonal = taste.length > 0 || activity.some((d) => d.total > 0);
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-app space-y-10 px-4 sm:px-6 py-6 sm:py-8">
      <PageMeta title={t("insights.title")} />
      <header>
        <h1 className="text-2xl font-bold">{t("insights.title")}</h1>
        <p className="text-sm text-muted">{t("insights.subtitle")}</p>
      </header>

      {/* ================= Badges & Wrapped ================= */}
      <YourYear />

      {/* ================= Trends ================= */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">{t("insights.trends")}</h2>
        {trendsError ? (
          <ErrorState
            error={trendsError}
            onRetry={() => (trendingMovies.refetch(), trendingTv.refetch())}
          />
        ) : trendsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} h="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("insights.avgRating")}
              value={average(trending.map((m) => m.vote_average)).toFixed(1)}
              hint={t("insights.avgRatingHint", { n: trending.length })}
            />
            <StatTile
              label={t("insights.recent")}
              value={`${recentShare(trending, now)}%`}
              hint={t("insights.recentHint")}
            />
            <StatTile
              label={t("insights.topGenre")}
              value={
                <span className="text-2xl">{genres[0] ? genreName(genres[0].genreId) : "—"}</span>
              }
              hint={
                genres[0] &&
                t("insights.topGenreHint", { n: genres[0].total, total: trending.length })
              }
            />
            <StatTile
              label={t("insights.onAir")}
              value={
                onAir.data ? new Intl.NumberFormat(locale).format(onAir.data.total_results) : "—"
              }
              hint={t("insights.onAirHint")}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {trendsLoading ? (
            <Skeleton />
          ) : (
            <ChartCard
              title={t("insights.genresTitle")}
              subtitle={t("insights.genresSub")}
              legend={
                <Legend
                  items={[
                    { label: t("search.movies"), className: "bg-viz-1" },
                    { label: t("search.tv"), className: "bg-viz-2" },
                  ]}
                />
              }
              table={
                <DataTable
                  head={[t("insights.genre"), t("search.movies"), t("search.tv")]}
                  rows={genres.map((g) => [genreName(g.genreId), g.movie, g.tv])}
                />
              }
            >
              <BarList
                rows={genres.map((g) => ({
                  key: g.genreId,
                  label: genreName(g.genreId),
                  segments: [
                    { value: g.movie, className: "bg-viz-1", label: t("search.movies") },
                    { value: g.tv, className: "bg-viz-2", label: t("search.tv") },
                  ],
                }))}
              />
            </ChartCard>
          )}

          {topRated.some((q) => q.isPending) ? (
            <Skeleton />
          ) : (
            <ChartCard
              title={t("insights.decadesTitle")}
              subtitle={t("insights.decadesSub", { n: topRatedItems.length })}
              table={
                <DataTable
                  head={[t("insights.decade"), t("insights.count"), t("insights.avg")]}
                  rows={decades.map((d) => [`${d.decade}s`, d.count, d.avgRating.toFixed(2)])}
                />
              }
            >
              <ColumnChart
                height={200}
                data={decades.map((d) => ({
                  key: String(d.decade),
                  label: `${d.decade}s`,
                  value: d.count,
                }))}
                tooltip={(d) => {
                  const row = decades.find((x) => String(x.decade) === d.key);
                  if (!row) return null;
                  return (
                    <>
                      <span className="font-semibold">{d.key}s</span>
                      <span className="ml-2 text-muted">
                        {t("insights.count")} <b className="text-fg">{row.count}</b> ·{" "}
                        {t("insights.avg")} <b className="text-fg">{row.avgRating.toFixed(2)}</b>
                      </span>
                    </>
                  );
                }}
              />
            </ChartCard>
          )}
        </div>
      </section>

      {/* ================= Your taste ================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">{t("insights.you")}</h2>
          <p className="text-xs text-muted">{t("insights.privacy")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label={t("insights.viewed")} value={history.length} />
          <StatTile
            label={t("insights.saved")}
            value={watchlist.length}
            hint={t("insights.savedHint", {
              movies: watchlist.filter((e) => e.movie.media_type !== "tv").length,
              tv: watchlist.filter((e) => e.movie.media_type === "tv").length,
            })}
          />
          <StatTile label={t("insights.liked")} value={likes} />
          <StatTile
            label={t("insights.favGenre")}
            value={<span className="text-2xl">{taste[0] ? genreName(taste[0].genreId) : "—"}</span>}
          />
        </div>

        {!hasPersonal ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
            {t("insights.empty")}{" "}
            <Link to="/discover" className="font-semibold text-accent hover:underline">
              {t("nav.discover")} →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title={t("insights.yourGenres")}
              subtitle={t("insights.yourGenresSub")}
              table={
                <DataTable
                  head={[t("insights.genre"), t("insights.score")]}
                  rows={taste.map((g) => [genreName(g.genreId), g.score])}
                />
              }
            >
              <BarList
                max={100}
                rows={taste.map((g) => ({
                  key: g.genreId,
                  label: genreName(g.genreId),
                  segments: [{ value: g.score, className: "bg-viz-1", label: t("insights.score") }],
                }))}
              />
            </ChartCard>
            <ChartCard
              title={t("insights.activity")}
              subtitle={t("insights.activitySub")}
              table={
                <DataTable
                  head={[
                    t("insights.date"),
                    t("insights.type.view"),
                    t("insights.type.trailer"),
                    t("insights.type.watchlist"),
                    t("insights.type.like"),
                  ]}
                  rows={activity
                    .filter((d) => d.total > 0)
                    .map((d) => [
                      dayLabel(d.date),
                      d.byType.view ?? 0,
                      d.byType.trailer ?? 0,
                      d.byType.watchlist ?? 0,
                      d.byType.like ?? 0,
                    ])}
                />
              }
            >
              <ColumnChart
                height={180}
                labelEvery={6}
                data={activity.map((d) => ({
                  key: d.date,
                  label: dayLabel(d.date),
                  value: d.total,
                }))}
                tooltip={(d) => {
                  const row = activity.find((x) => x.date === d.key);
                  if (!row) return null;
                  return (
                    <>
                      <span className="font-semibold">{d.label}</span>
                      <span className="ml-2 text-muted">
                        {t("insights.actions", { n: row.total })}
                      </span>
                      {Object.entries(row.byType).map(([type, n]) => (
                        <span key={type} className="ml-2 text-muted">
                          {t(TYPE_LABEL[type as SignalType] ?? "insights.type.view")}{" "}
                          <b className="text-fg">{n}</b>
                        </span>
                      ))}
                    </>
                  );
                }}
              />
            </ChartCard>
          </div>
        )}
      </section>
    </div>
  );
}
