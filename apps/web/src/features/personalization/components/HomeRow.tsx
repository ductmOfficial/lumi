import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MovieRow } from "@/components/MovieRow";
import { useT, type TFunction } from "@/i18n/useT";
import { useInView } from "@/hooks/useInView";
import { usePreferences, useTmdbLocale, type RowLayoutChoice } from "@/stores/preferences";
import { LayoutToggle } from "@/components/LayoutToggle";
import { formatDate, formatRelative } from "@/lib/format";
import type { PreviewMovie } from "@/features/preview/store";
import type { CardVariant } from "@/components/MovieCard";
import type { ContextKey, RowLayout, RowSpec, TvListKind } from "../engine";
import { rowQuery } from "../rowQueries";
import { useLibrary } from "@/features/library/store";
import { useDislikedKeys, usePersonalization } from "../store";
import { mediaKey } from "@/lib/slug";
import { useGenreNames } from "../hooks";
import type { MessageKey } from "@lumi/i18n";
import { themeBySlug } from "@/features/discover/catalog";
import { FollowTopicButton } from "./FollowTopicButton";
import { SpotlightRow } from "./SpotlightRow";
import { Clapperboard } from "lucide-react";

const CONTEXT_TITLE: Record<ContextKey, MessageKey> = {
  "weekend-horror": "rows.ctx.weekendHorror",
  halloween: "rows.ctx.halloween",
  christmas: "rows.ctx.christmas",
  short: "rows.ctx.short",
  vietnamese: "rows.ctx.vietnamese",
  korean: "rows.ctx.korean",
  family: "rows.ctx.family",
  kdrama: "rows.ctx.kdrama",
  anime: "rows.ctx.anime",
  miniseries: "rows.ctx.miniseries",
  completed: "rows.ctx.completed",
};
const TV_LIST_TITLE: Record<TvListKind, MessageKey> = {
  trending: "rows.tvTrending",
  on_the_air: "rows.tvOnAir",
  top_rated: "rows.tvTopRated",
  airing_today: "rows.tvAiringToday",
  popular: "rows.tvPopular",
};

const CONTEXT_REASON: Partial<Record<ContextKey, MessageKey>> = {
  "weekend-horror": "rows.reason.weekend",
  short: "rows.reason.short",
  family: "rows.reason.tet",
  miniseries: "rows.reason.miniseries",
  completed: "rows.reason.completed",
};

function rowText(spec: RowSpec, t: TFunction, genre: (id: number) => string) {
  switch (spec.kind) {
    case "continue":
      return { title: t("rows.continue"), reason: t("rows.reason.continue") };
    case "watchlist":
      return { title: t("rows.watchlist") };
    case "top10":
      return { title: t(spec.media === "tv" ? "rows.top10Tv" : "rows.top10") };
    case "trending":
      return { title: t("rows.trendingToday") };
    case "because":
      return {
        title: t(
          spec.reason === "like"
            ? "rows.becauseLiked"
            : spec.reason === "watchlist"
              ? "rows.becauseSaved"
              : "rows.becauseWatched",
          {
            title: spec.movie.title,
          },
        ),
      };
    case "genre":
      return {
        title: genre(spec.genreId),
        reason: t("rows.reason.genre", { genre: genre(spec.genreId) }),
      };
    case "explore":
      return {
        title: t("rows.explore", { genre: genre(spec.genreId) }),
        reason: t("rows.reason.explore"),
      };
    case "classics":
      return { title: t("rows.classics"), reason: t("rows.reason.classics") };
    case "list":
      return {
        title: t(
          spec.category === "now_playing"
            ? "home.nowPlaying"
            : spec.category === "upcoming"
              ? "home.upcoming"
              : spec.category === "top_rated"
                ? "home.topRated"
                : "home.popular",
        ),
      };
    case "tv":
      return {
        title: t(TV_LIST_TITLE[spec.list]),
        reason: spec.list === "on_the_air" ? t("rows.reason.tv") : undefined,
      };
    case "topic": {
      const theme = themeBySlug(spec.slug);
      return {
        title: theme ? (
          <span className="inline-flex items-center gap-2">
            <theme.icon aria-hidden className="size-5 shrink-0 text-accent" strokeWidth={2} />
            {t(theme.label)}
          </span>
        ) : (
          spec.slug
        ),
        reason: t(spec.followed ? "rows.reason.topic" : "rows.reason.topicSuggest"),
      };
    }
    case "provider":
      return {
        title: (
          <span className="inline-flex items-center gap-2">
            <Clapperboard aria-hidden className="size-5 shrink-0 text-accent" strokeWidth={2} />
            {t("rows.streamingNew", { name: spec.provider.name })}
          </span>
        ),
        // JustWatch requires attribution wherever watch-provider data is shown
        reason: t(spec.media === "tv" ? "rows.reason.streamingTv" : "rows.reason.streaming", {
          name: spec.provider.name,
        }),
      };
    case "context": {
      const reason = CONTEXT_REASON[spec.context];
      return { title: t(CONTEXT_TITLE[spec.context]), reason: reason ? t(reason) : undefined };
    }
  }
}

function seeAllFor(spec: RowSpec): string | undefined {
  switch (spec.kind) {
    case "watchlist":
      return "/watchlist";
    case "list":
      return `/movies/${spec.category}`;
    case "tv":
      return `/series/${spec.list === "trending" ? "popular" : spec.list}`;
    case "genre":
    case "explore":
      return `/discover/browse?${spec.media === "tv" ? "type=tv&" : ""}genres=${spec.genreId}`;
    case "context":
      if (spec.context === "kdrama") return "/discover/browse?type=tv&lang=ko&genres=18";
      if (spec.context === "anime") return "/discover/browse?type=tv&lang=ja&genres=16";
      if (spec.context === "miniseries")
        return "/discover/browse?type=tv&format=miniseries&rating=7";
      if (spec.context === "completed") return "/discover/browse?type=tv&status=ended&rating=7";
      return undefined;
    case "topic":
      return `/discover/browse?${spec.media === "tv" ? "type=tv&" : ""}theme=${spec.slug}`;
    case "provider":
      return `/discover/browse?${spec.media === "tv" ? "type=tv&" : ""}provider=${spec.provider.id}`;
    default:
      return undefined;
  }
}

const VARIANT: Partial<Record<RowSpec["kind"], CardVariant>> = {
  top10: "rank",
  continue: "landscape",
  because: "landscape",
};
const NO_DEDUPE = new Set<RowSpec["kind"]>(["continue", "watchlist", "top10", "provider"]);

interface HomeRowProps {
  spec: RowSpec;
  index: number;
  eager: boolean;
  /** ids of titles already shown in rows above (to avoid repeats) */
  claimedAbove: ReadonlySet<string>;
  onClaim: (index: number, keys: string[]) => void;
  /** special layout chosen by assignLayouts */
  layout?: RowLayout;
}

/** Label on the row's featured card */
function featureLabelFor(spec: RowSpec, t: TFunction): string {
  switch (spec.kind) {
    case "because":
      return t("rows.feature.because");
    case "topic":
      return t("rows.feature.topic");
    case "classics":
      return t("rows.feature.classics");
    case "context":
      return t(spec.context === "completed" ? "rows.feature.completed" : "rows.feature.topic");
    default:
      return t("rows.feature.topic");
  }
}

const DAY_MS = 86_400_000;
/** Days from today until the release date (local time) */
function daysUntil(date: string | undefined, now: Date) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / DAY_MS);
}

/** Rows whose layout cannot change: Top 10 (rank cards) and watch history (landscape cards with timestamps) */
const FIXED_LAYOUT = new Set<RowSpec["kind"]>(["top10", "continue"]);

export function HomeRow({
  spec,
  index,
  eager,
  claimedAbove,
  onClaim,
  layout: autoLayout = "default",
}: HomeRowProps) {
  const t = useT();
  const ctx = useTmdbLocale();
  const genreNames = useGenreNames();
  const disliked = useDislikedKeys();
  const watched = useLibrary((s) => s.watched);
  const history = usePersonalization((s) => s.history);
  const watchlist = usePersonalization((s) => s.watchlist);
  const [ref, inView] = useInView<HTMLDivElement>("400px", eager);
  const [now] = useState(() => new Date());

  // Layout: defaults to the engine's choice (autoLayout); the user can change it and the choice is remembered per row id
  const canToggle = !FIXED_LAYOUT.has(spec.kind);
  const override = usePreferences((s) => s.rowLayouts[spec.id]);
  const setRowLayout = usePreferences((s) => s.setRowLayout);
  const autoChoice: RowLayoutChoice = autoLayout === "spotlight" ? "spotlight" : "list";
  const choice: RowLayoutChoice = canToggle ? (override ?? autoChoice) : autoChoice;
  // choosing "regular row" for a row that is large posters by nature (Upcoming) keeps the large posters
  const layout: RowLayout =
    choice === "spotlight" ? "spotlight" : autoLayout === "spotlight" ? "default" : autoLayout;

  const isLocal = spec.kind === "continue" || spec.kind === "watchlist";
  const query = useQuery({
    ...rowQuery(isLocal ? { id: "top10", kind: "top10" } : spec, ctx),
    enabled: !isLocal && inView,
  });

  const raw: PreviewMovie[] | undefined = useMemo(() => {
    const ofMedia = (m: PreviewMovie) =>
      !("media" in spec) || !spec.media || (m.media_type ?? "movie") === spec.media;
    if (spec.kind === "continue") return history.map((e) => e.movie).filter(ofMedia);
    if (spec.kind === "watchlist") return watchlist.map((e) => e.movie).filter(ofMedia);
    let list = query.data;
    if (!list) return undefined;
    list = list.filter((m) => !disliked.has(mediaKey(m)));
    // watched titles are not recommended again (except in the rankings)
    if (spec.kind !== "top10") list = list.filter((m) => !watched[mediaKey(m)]);
    if (spec.kind === "classics") {
      const seen = new Set(history.map((e) => mediaKey(e.movie)));
      list = list.filter((m) => !seen.has(mediaKey(m)));
    }
    if (spec.kind === "because") list = list.filter((m) => mediaKey(m) !== mediaKey(spec.movie));
    return list;
  }, [spec, history, watchlist, query.data, disliked, watched]);

  // report the ids used to the rows below
  const dedupe = !NO_DEDUPE.has(spec.kind);
  useEffect(() => {
    if (dedupe && raw) onClaim(index, raw.slice(0, 12).map(mediaKey));
  }, [dedupe, raw, index, onClaim]);

  const movies = useMemo(() => {
    if (!raw || !dedupe) return raw;
    const filtered = raw.filter((m) => !claimedAbove.has(mediaKey(m)));
    // if deduplication makes the row too sparse, keep the original list
    return filtered.length >= 6 ? filtered : raw;
  }, [raw, dedupe, claimedAbove]);

  if (movies?.length === 0 && !query.isPending) return null;

  const { title, reason } = rowText(spec, t, (id) => genreNames.get(id) ?? "…");
  // featured rows always use posters so the first (double-width) card lines up with the other posters
  const variant = layout === "spotlight" ? "poster" : (VARIANT[spec.kind] ?? "poster");
  const isUpcoming = spec.kind === "list" && spec.category === "upcoming";
  const countdown = (m: PreviewMovie) => {
    const n = daysUntil(m.release_date, now);
    if (n === null || n < 0) return undefined;
    return n === 0
      ? t("rows.upcoming.today")
      : n === 1
        ? t("rows.upcoming.tomorrow")
        : t("rows.upcoming.days", { n });
  };
  const viewed = new Map(history.map((e) => [mediaKey(e.movie), e]));
  const continueSubtitle = (m: PreviewMovie) => {
    const e = viewed.get(mediaKey(m));
    const when = formatRelative(e?.at, ctx.locale);
    return e?.via === "trailer" ? `${t("rows.viaTrailer")} · ${when}` : when;
  };

  const topicAction =
    spec.kind === "topic" ? <FollowTopicButton slug={spec.slug} size="sm" /> : undefined;
  const layoutToggle = canToggle ? (
    // same as the default → clear the custom choice so the row follows the engine
    <LayoutToggle
      value={choice}
      onChange={(v) => {
        setRowLayout(spec.id, v === autoChoice ? null : v);
      }}
    />
  ) : undefined;

  if (layout === "spotlight") {
    return (
      <div ref={ref}>
        <SpotlightRow
          title={title}
          reason={reason}
          actions={topicAction}
          headerExtra={layoutToggle}
          seeAllTo={seeAllFor(spec)}
          movies={movies}
          isLoading={!isLocal && (query.isPending || !inView)}
          error={query.error}
          onRetry={() => query.refetch()}
          featureLabel={featureLabelFor(spec, t)}
        />
      </div>
    );
  }

  return (
    <div ref={ref}>
      <MovieRow
        title={title}
        reason={reason}
        variant={variant}
        movies={movies}
        isLoading={!isLocal && (query.isPending || !inView)}
        error={query.error}
        onRetry={() => query.refetch()}
        seeAllTo={seeAllFor(spec)}
        actions={topicAction}
        headerExtra={layoutToggle}
        subtitleFor={
          spec.kind === "continue"
            ? continueSubtitle
            : isUpcoming
              ? (m) => formatDate(m.release_date, ctx.locale)
              : undefined
        }
        badgeFor={isUpcoming ? countdown : undefined}
        layout={layout === "large" ? "large" : "default"}
      />
    </div>
  );
}
