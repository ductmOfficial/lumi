import { useState } from "react";
import { Clapperboard, Tv } from "lucide-react";
import { Link } from "react-router";
import clsx from "clsx";
import { tmdbImage, type MovieDetail, type SeasonSummary } from "@/lib/tmdb";
import { movieHref } from "@/lib/slug";
import { formatDate, formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { ChevronRightIcon, StarIcon } from "@/components/icons";
import { Poster } from "@/components/Poster";

/** Seasons shown before the "Show all N seasons" button */
const COLLAPSED = 5;

/**
 * "Seasons" card for series — same position and style as a movie's Collection card:
 * banner + season list (the airing season has an episode progress bar) + next episode.
 */
export function SeasonsCard({ movie }: { movie: MovieDetail }) {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [expanded, setExpanded] = useState(false);
  const tv = movie.tv;
  if (!tv || tv.seasons.length === 0) return null;

  const base = movieHref(movie);
  const next = tv.next_episode_to_air;
  const last = tv.last_episode_to_air;
  // "Airing" season: the one with an upcoming episode, or the latest episode's season while the series is in production
  const airingSeason = next?.season_number ?? (tv.in_production ? last?.season_number : undefined);
  // Latest season that has aired (skip Specials = season 0)
  const latestAired = Math.max(
    0,
    ...tv.seasons
      .filter((s) => s.season_number > 0 && s.air_date && s.air_date <= today)
      .map((s) => s.season_number),
  );
  // binge time: episode count × episode runtime
  const episodeMinutes = movie.runtime || last?.runtime || tv.episode_run_time[0] || 0;
  const bingeHours = episodeMinutes
    ? Math.max(1, Math.round((tv.number_of_episodes * episodeMinutes) / 60))
    : 0;
  const isShort = tv.type === "Miniseries" || (!tv.in_production && tv.number_of_seasons <= 2);
  const isUpcoming = (s: SeasonSummary) => !s.air_date || s.air_date > today;

  // Collapsed: always keep the airing / latest season in the visible list
  const pinned = new Set([airingSeason, latestAired]);
  const visible = expanded
    ? tv.seasons
    : tv.seasons
        .filter((s, i) => i < COLLAPSED || pinned.has(s.season_number))
        .slice(0, COLLAPSED + 1);
  const hidden = tv.seasons.length - visible.length;

  return (
    <section
      id="seasons"
      className="scroll-mt-32 overflow-hidden rounded-xl border border-border bg-surface"
    >
      <Link to={`${base}/seasons`} className="relative block aspect-[21/9] bg-surface-2">
        {movie.backdrop_path && (
          <img
            src={tmdbImage(movie.backdrop_path, "w780")}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 text-white">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
            <Tv aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
            {t("seasonsCard.title")}
            <span
              className={clsx(
                "rounded-full px-1.5 py-px text-[9px] tracking-wider",
                tv.in_production ? "bg-success/90 text-white" : "bg-white/20 text-white",
              )}
            >
              {tv.in_production ? t("tv.airing") : t("tv.ended")}
            </span>
          </p>
          <h2 className="text-lg font-black leading-tight">{movie.title}</h2>
          <p className="text-xs text-white/80">
            {t("tv.seasons", { n: tv.number_of_seasons })} ·{" "}
            {t("tv.episodes", { n: tv.number_of_episodes })} · {formatYear(tv.first_air_date)}–
            {tv.in_production ? t("tv.present") : formatYear(tv.last_air_date ?? undefined)}
          </p>
          {(bingeHours > 0 || isShort) && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              {isShort && (
                <span className="rounded-full bg-white/20 px-2 py-0.5">
                  <Clapperboard aria-hidden className="mr-1 inline size-3 align-[-1px]" />
                  {t("seasonsCard.short")}
                </span>
              )}
              {bingeHours > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5">
                  ⏱ {t("seasonsCard.binge", { h: bingeHours })}
                </span>
              )}
            </p>
          )}
        </div>
      </Link>

      <ol className="divide-y divide-border">
        {visible.map((s) => {
          const airing = s.season_number === airingSeason;
          const upcoming = isUpcoming(s);
          // progress: aired episodes / total episodes of the airing season
          const aired =
            airing && last?.season_number === s.season_number
              ? last.episode_number
              : airing
                ? 0
                : undefined;
          return (
            <li key={s.id}>
              <Link
                to={`${base}/seasons/${s.season_number}`}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 transition hover:bg-surface-2",
                  airing && "bg-accent/5",
                )}
              >
                <span
                  className={clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    airing ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
                  )}
                >
                  {s.season_number || "★"}
                </span>
                <Poster
                  path={s.poster_path ?? movie.poster_path}
                  alt={s.name}
                  sizes="64px"
                  className={clsx(
                    "w-14 shrink-0 rounded-md sm:w-16",
                    airing && "ring-2 ring-accent",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {s.air_date && formatYear(s.air_date)}
                    <span>{t("tv.episodes", { n: s.episode_count })}</span>
                    {s.vote_average > 0 && !upcoming && (
                      <span className="inline-flex items-center gap-0.5">
                        <StarIcon size={11} className="text-warning" /> {s.vote_average.toFixed(1)}
                      </span>
                    )}
                  </span>
                  {aired !== undefined && s.episode_count > 0 && (
                    <span className="mt-1 flex items-center gap-2">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${Math.min(100, (aired / s.episode_count) * 100)}%` }}
                        />
                      </span>
                      <span className="text-[10px] tabular-nums text-muted">
                        {t("seasonsCard.progress", { a: aired, n: s.episode_count })}
                      </span>
                    </span>
                  )}
                </span>
                {airing ? (
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                    {t("tv.airing")}
                  </span>
                ) : upcoming ? (
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {t("tv.upcoming")}
                  </span>
                ) : s.season_number === latestAired ? (
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {t("seasonsCard.latest")}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>

      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => {
            setExpanded((v) => !v);
          }}
          className="w-full border-t border-border py-2 text-xs font-semibold text-accent hover:bg-surface-2"
        >
          {expanded
            ? t("seasonsCard.showLess")
            : t("seasonsCard.showAll", { n: tv.seasons.length })}
        </button>
      )}

      {next && (
        <Link
          to={`${base}/seasons/${next.season_number}`}
          className="flex items-center gap-3 border-t border-border bg-surface-2/50 px-3 py-2.5 text-xs hover:bg-surface-2"
        >
          <span className="text-lg" aria-hidden>
            ⏭️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-muted">
              {t("tv.nextEpisode")} ·{" "}
              {t("tv.episodeCode", { s: next.season_number, e: next.episode_number })}
              {next.air_date && ` · ${formatDate(next.air_date, locale)}`}
            </span>
            <span className="block truncate font-semibold">{next.name}</span>
          </span>
          <ChevronRightIcon size={16} className="shrink-0 text-muted" />
        </Link>
      )}
    </section>
  );
}
