import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import clsx from "clsx";
import { Circle, CircleCheckBig } from "lucide-react";
import { episodeKey, useLibrary } from "@/features/library/store";
import { toast } from "@/stores/toast";
import { tmdbImage, type Episode } from "@/lib/tmdb";
import { formatDate, formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { StarIcon } from "@/components/icons";
import { ExpandableText } from "@/components/profile/ExpandableText";
import { ErrorState } from "@/components/ErrorState";
import { useMovieProfile } from "@/features/movies/profile/context";
import { useSeason } from "./api";

/** "Seasons" tab: each season is like a photo album — click to see its episodes. */
export function SeasonsTab() {
  const t = useT();
  const { movie } = useMovieProfile();
  const tv = movie.tv;
  if (!tv) return <Navigate to=".." replace />;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {tv.seasons.map((se) => {
        const latest = tv.last_episode_to_air?.season_number === se.season_number;
        return (
          <Link key={se.id} to={String(se.season_number)} className="group">
            <div className="relative overflow-hidden rounded-xl bg-surface-2 shadow-card">
              {/* "stacked album" effect */}
              <div className="absolute inset-x-3 -top-1.5 h-3 rounded-t-xl bg-surface-2/70" />
              <img
                src={tmdbImage(se.poster_path ?? movie.poster_path, "w342")}
                alt={se.name}
                loading="lazy"
                className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-10 text-white">
                <p className="font-black leading-tight">{se.name}</p>
                <p className="text-xs text-white/80">
                  {formatYear(se.air_date)} · {t("tv.episodes", { n: se.episode_count })}
                </p>
              </div>
              {latest && (
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">
                  {t("tv.latestEpisode")}
                </span>
              )}
              {se.vote_average > 0 && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  <StarIcon size={10} className="text-amber-400" /> {se.vote_average.toFixed(1)}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EpisodeRow({
  ep,
  latest,
  next,
  seen,
  onToggleSeen,
}: {
  ep: Episode;
  latest: boolean;
  next: boolean;
  seen: boolean;
  onToggleSeen: () => void;
}) {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const upcoming = !ep.air_date || ep.air_date > today;

  return (
    <li
      id={`ep-${ep.episode_number}`}
      className={clsx(
        "flex flex-col gap-3 rounded-xl border bg-surface p-3 sm:flex-row",
        latest || next ? "border-accent" : "border-border",
        seen && "opacity-80",
      )}
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-64">
        {ep.still_path ? (
          <img
            src={tmdbImage(ep.still_path, "w500")}
            alt=""
            loading="lazy"
            className={clsx("h-full w-full object-cover", upcoming && "opacity-50 grayscale")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl font-black text-muted">
            E{ep.episode_number}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white">
          {t("tv.episodeCode", { s: ep.season_number, e: ep.episode_number })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 font-bold">{ep.name}</h3>
          {/* mark an episode as watched (not for unaired episodes) */}
          {!upcoming && (
            <button
              type="button"
              onClick={onToggleSeen}
              aria-pressed={seen}
              className={clsx(
                "order-last inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition sm:order-none",
                seen
                  ? "bg-success/15 text-success hover:bg-success/25"
                  : "border border-border text-muted hover:border-fg hover:text-fg",
              )}
            >
              {seen ? <CircleCheckBig size={14} /> : <Circle size={14} />}
              {seen ? t("lib.episodeSeen") : t("lib.markEpisode")}
            </button>
          )}
          {latest && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">
              {t("tv.latestEpisode")}
            </span>
          )}
          {next && (
            <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
              {t("tv.nextEpisode")}
            </span>
          )}
          {upcoming && !next && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
              {t("tv.upcoming")}
            </span>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {ep.air_date && <span>{formatDate(ep.air_date, locale)}</span>}
          {ep.runtime ? <span>· {t("tv.minutes", { n: ep.runtime })}</span> : null}
          {ep.vote_average > 0 && !upcoming && (
            <span className="inline-flex items-center gap-0.5">
              · <StarIcon size={11} className="text-warning" /> {ep.vote_average.toFixed(1)}
            </span>
          )}
        </p>
        {ep.overview && (
          <ExpandableText text={ep.overview} lines={3} className="mt-2 text-sm text-fg/85" />
        )}
      </div>
    </li>
  );
}

/** /tv/:id/seasons/:seasonNumber — season details + episode list, with quick season switching. */
export function SeasonDetailTab() {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const { movie } = useMovieProfile();
  const tv = movie.tv;
  const n = Number(useParams().seasonNumber);
  const q = useSeason(movie.id, Number.isFinite(n) ? n : null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const seenList = useLibrary((s) => s.progress[String(movie.id)]?.seen);
  const seenSet = useMemo(() => new Set(seenList ?? []), [seenList]);
  const setEpisodes = useLibrary((s) => s.setEpisodes);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  useHorizontalScroll(chipsRef);

  // scroll the selected season chip to the center
  useEffect(() => {
    chipsRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [n]);

  if (!tv) return <Navigate to=".." replace />;
  const summary = tv.seasons.find((s) => s.season_number === n);
  const aired = (q.data?.episodes ?? []).filter((e) => e.air_date && e.air_date <= today);
  const seenInSeason = aired.filter((e) =>
    seenSet.has(episodeKey(e.season_number, e.episode_number)),
  ).length;

  return (
    <div className="space-y-4">
      {/* season switcher */}
      <div
        ref={chipsRef}
        className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"
      >
        <Link
          to=".."
          relative="path"
          className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:bg-border"
        >
          ← {t("tv.allSeasons")}
        </Link>
        {tv.seasons.map((se) => (
          <Link
            key={se.id}
            to={`../${se.season_number}`}
            relative="path"
            replace
            aria-current={se.season_number === n ? "page" : undefined}
            className={clsx(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              se.season_number === n ? "bg-fg text-bg" : "bg-surface-2 hover:bg-border",
            )}
          >
            {se.name}
          </Link>
        ))}
      </div>

      {/* season details */}
      <section className="flex gap-4 rounded-xl border border-border bg-surface p-4">
        <img
          src={tmdbImage(summary?.poster_path ?? q.data?.poster_path ?? movie.poster_path, "w342")}
          alt=""
          className="aspect-[2/3] w-24 shrink-0 rounded-lg object-cover sm:w-32"
        />
        <div className="min-w-0">
          <h2 className="text-xl font-black">
            {summary?.name ?? q.data?.name ?? t("tv.season", { n })}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {formatDate(summary?.air_date, locale)} ·{" "}
            {t("tv.episodes", { n: summary?.episode_count ?? q.data?.episodes.length ?? 0 })}
            {summary && summary.vote_average > 0 && ` · ★ ${summary.vote_average.toFixed(1)}`}
          </p>
          {(summary?.overview || q.data?.overview) && (
            <ExpandableText
              text={summary?.overview || q.data?.overview || ""}
              lines={4}
              className="mt-2 text-sm text-fg/85"
            />
          )}
        </div>
      </section>

      {q.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.episodes.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {t("tv.noEpisodes")}
        </p>
      ) : (
        <>
          {/* progress for this season */}
          {aired.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {t("lib.seasonProgress", { a: seenInSeason, n: aired.length })}
                </p>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-success transition-all"
                    style={{ width: `${(seenInSeason / aired.length) * 100}%` }}
                  />
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const all = seenInSeason < aired.length;
                  setEpisodes(
                    movie,
                    aired.map((e) => episodeKey(e.season_number, e.episode_number)),
                    all,
                  );
                  toast(all ? t("lib.seasonMarked") : t("lib.seasonUnmarked"));
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold hover:bg-border"
              >
                <CircleCheckBig size={16} />{" "}
                {seenInSeason < aired.length ? t("lib.markSeason") : t("lib.unmarkSeason")}
              </button>
            </div>
          )}
          <ol className="space-y-3">
            {q.data.episodes.map((ep) => {
              const k = episodeKey(ep.season_number, ep.episode_number);
              return (
                <EpisodeRow
                  key={ep.id}
                  ep={ep}
                  latest={tv.last_episode_to_air?.id === ep.id}
                  next={tv.next_episode_to_air?.id === ep.id}
                  seen={seenSet.has(k)}
                  onToggleSeen={() => {
                    setEpisodes(movie, [k], !seenSet.has(k));
                  }}
                />
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
