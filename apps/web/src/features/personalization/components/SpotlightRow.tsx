import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { tmdbFetch, tmdbImage, type Video } from "@/lib/tmdb";
import { mediaKey, movieHref } from "@/lib/slug";
import { formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { useTmdbLocale } from "@/stores/preferences";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  PlayIcon,
  StarIcon,
  TvIcon,
} from "@/components/icons";
import { ErrorState } from "@/components/ErrorState";
import { RowHeader } from "@/components/MovieRow";
import { TrailerPlayer } from "@/features/movies/components/TrailerPlayer";
import { pickTrailer } from "@/features/movies/utils";
import { useMediaBriefText } from "@/features/media/brief";
import type { PreviewMovie } from "@/features/preview/store";
import { MovieActions } from "./MovieActions";
import { PlayingBars } from "@/components/PlayingBars";
import { useGenreNames, useMatchPercent } from "../hooks";
import { usePersonalization } from "../store";

/** A trailer must play long enough to count as "watched" (avoids accidental / test clicks) */
const TRAILER_COUNT_MS = 8000;

interface SpotlightRowProps {
  title: ReactNode;
  reason?: ReactNode;
  actions?: ReactNode;
  seeAllTo?: string;
  headerExtra?: ReactNode;
  movies: PreviewMovie[] | undefined;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** label on the featured frame (e.g. "Best match") — only shown while the first item is selected */
  featureLabel?: string;
}

/** Videos of a movie/series — shares its cache with the banner's background trailer */
function useTrailer(m: PreviewMovie | undefined) {
  const { language } = useTmdbLocale();
  const media = m?.media_type ?? "movie";
  const q = useQuery({
    queryKey: [media, "videos", m?.id, language],
    queryFn: ({ signal }) =>
      tmdbFetch<{ results: Video[] }>(
        `/${media}/${m?.id ?? 0}/videos`,
        { language, include_video_language: `${language.slice(0, 2)},en,null` },
        signal,
      ),
    enabled: !!m,
    staleTime: Infinity,
  });
  return {
    trailer: q.data ? pickTrailer(q.data.results, language.slice(0, 2)) : undefined,
    isPending: q.isPending,
  };
}

/**
 * Single-block featured row: a large 16:9 frame on the left (backdrop + details, press ▶ to play the trailer in place),
 * the item list on the right — clicking an item moves it into the frame instead of opening the detail page.
 */
export function SpotlightRow({
  title,
  reason,
  actions,
  seeAllTo,
  headerExtra,
  movies,
  isLoading,
  error,
  onRetry,
  featureLabel,
}: SpotlightRowProps) {
  const t = useT();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const items = useMemo(() => (movies ?? []).slice(0, MAX_ITEMS), [movies]);
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const pageItems = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected = items.find((m) => mediaKey(m) === selectedKey) ?? items[0];
  const selectedIndex = selected ? items.indexOf(selected) : -1;

  const { trailer, isPending: trailerPending } = useTrailer(selected);
  // video mode persists when switching items: if the new item has a trailer it plays right away
  const brief = useMediaBriefText(selected ?? { id: 0 }, !!selected);
  const match = useMatchPercent(selected?.genre_ids);
  const genreNames = useGenreNames();
  const genres = (selected?.genre_ids ?? [])
    .map((g) => genreNames.get(g))
    .filter(Boolean)
    .slice(0, 3);

  const stageRef = useRef<HTMLDivElement>(null);
  const showVideo = playing && !!trailer;

  // Trailer watched ≥ 8 seconds → record a personalization signal + add to "Recently viewed" (once per item)
  const recordTrailer = usePersonalization((s) => s.recordTrailer);
  const recordedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!showVideo || !selected) return;
    const key = mediaKey(selected);
    if (recordedRef.current.has(key)) return;
    const timer = setTimeout(() => {
      recordedRef.current.add(key);
      recordTrailer(selected, { addToHistory: true });
    }, TRAILER_COUNT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [showVideo, selected, recordTrailer]);

  const select = (m: PreviewMovie) => {
    setSelectedKey(mediaKey(m));
    // mobile: the frame sits above the list → scroll up to show the selected item
    const el = stageRef.current;
    if (el && el.getBoundingClientRect().top < 56)
      el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // per-item trailer button: stops if this item is playing; otherwise selects the item and plays it
  const toggleTrailer = (m: PreviewMovie) => {
    if (m === selected && playing) setPlaying(false);
    else {
      select(m);
      setPlaying(true);
    }
  };

  if (error) {
    return (
      <section className="space-y-2 sm:space-y-3">
        <RowHeader
          title={title}
          reason={reason}
          actions={actions}
          seeAllTo={seeAllTo}
          headerExtra={headerExtra}
        />
        <ErrorState error={error} onRetry={onRetry} compact />
      </section>
    );
  }

  if (isLoading || !selected) {
    return (
      <section className="space-y-2 sm:space-y-3">
        <RowHeader
          title={title}
          reason={reason}
          actions={actions}
          seeAllTo={seeAllTo}
          headerExtra={headerExtra}
        />
        <div className={clsx(GRID, "animate-pulse")}>
          <div className={clsx(CARD, "aspect-video bg-surface-2")} />
          <div className={clsx(CARD, "grid gap-1.5 p-2")}>
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <div key={i} className="h-16 rounded-lg bg-surface-2" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const href = movieHref(selected);
  const backdrop = selected.backdrop_path ?? selected.poster_path;
  // Selected item details: overlaid on the backdrop (tablet/desktop), below the frame (mobile)
  const info = (
    <div className="flex min-w-0 flex-col gap-2 p-4 sm:p-6 lg:p-8">
      {featureLabel && selectedIndex === 0 && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-fg shadow">
          <StarIcon size={11} /> {featureLabel}
        </span>
      )}
      <Link to={href} className="group/title inline-flex max-w-full items-start gap-2">
        <h3 className="line-clamp-2 text-xl font-extrabold leading-tight drop-shadow group-hover/title:underline sm:text-2xl lg:text-3xl xl:text-4xl">
          {selected.title}
        </h3>
        {selected.media_type === "tv" && (
          <span
            title="Series"
            className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
          >
            <TvIcon size={13} />
          </span>
        )}
      </Link>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted sm:text-white/85">
        {match !== null && (
          <span className="font-bold text-success">{t("match.percent", { n: match })}</span>
        )}
        {selected.vote_average > 0 && (
          <span className="inline-flex items-center gap-1">
            <StarIcon size={13} className="text-warning" /> {selected.vote_average.toFixed(1)}
          </span>
        )}
        <span>{formatYear(selected.release_date)}</span>
        {brief && <span className="rounded border border-current/40 px-1.5 text-xs">{brief}</span>}
        {genres.length > 0 && <span className="text-xs">· {genres.join(" • ")}</span>}
      </p>
      {selected.overview && (
        <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-white/80 lg:line-clamp-4">
          {selected.overview}
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {trailer ? (
          <button
            type="button"
            onClick={() => {
              setPlaying((p) => !p);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90"
          >
            {showVideo ? <StopGlyph /> : <PlayIcon size={16} />}{" "}
            {showVideo ? t("spotlight.stop") : t("spotlight.play")}
          </button>
        ) : (
          !trailerPending && (
            <span className="text-xs text-muted sm:text-white/70">{t("spotlight.noTrailer")}</span>
          )
        )}
        <Link
          to={href}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-fg sm:border-white/40 sm:bg-black/30 sm:text-white sm:backdrop-blur sm:hover:border-white"
        >
          <InfoIcon size={16} /> {t("common.details")}
        </Link>
        <MovieActions movie={selected} />
      </div>
    </div>
  );

  return (
    <section className="space-y-2 sm:space-y-3">
      <RowHeader
        title={title}
        reason={reason}
        actions={actions}
        seeAllTo={seeAllTo}
        headerExtra={headerExtra}
      />

      <div className={GRID}>
        {/* Left: the large frame */}
        <div ref={stageRef} className={clsx(CARD, "min-w-0 scroll-mt-16")}>
          <div className="relative aspect-video overflow-hidden bg-black">
            {trailer && showVideo ? (
              // no button overlays the video so YouTube's controls stay usable — stop it from the list
              <TrailerPlayer key={trailer.key} video={trailer} autoPlay />
            ) : (
              <>
                {backdrop && (
                  <img
                    key={backdrop}
                    src={tmdbImage(backdrop, selected.backdrop_path ? "w1280" : "w500")}
                    alt=""
                    className="absolute inset-0 h-full w-full animate-fade-in object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:bg-gradient-to-r sm:from-black/90 sm:via-black/55 sm:to-transparent" />
                <div className="absolute inset-0 hidden bg-gradient-to-t from-black/70 via-transparent to-transparent sm:block" />
                {/* mobile: play button centered in the frame */}
                {trailer && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(true);
                    }}
                    aria-label={`${t("spotlight.play")}: ${selected.title}`}
                    className="absolute inset-0 grid place-items-center sm:hidden"
                  >
                    <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/60 backdrop-blur">
                      <PlayIcon size={26} />
                    </span>
                  </button>
                )}
                <div className="absolute inset-y-0 left-0 hidden w-full max-w-[min(42rem,85%)] flex-col justify-end text-white sm:flex">
                  {info}
                </div>
              </>
            )}
          </div>
          {/* mobile: details below the frame */}
          <div className="sm:hidden">{info}</div>
        </div>

        {/* Right: single-column list, 5 items per page — fits the video frame's height exactly, no scrolling */}
        <div className={clsx(CARD, "relative min-h-0")}>
          <div className="flex flex-col lg:absolute lg:inset-0">
            <ul
              aria-label={typeof title === "string" ? title : undefined}
              className="grid min-h-0 flex-1 grid-rows-5 gap-1 p-2"
            >
              {pageItems.map((m) => {
                const active = m === selected;
                const img = tmdbImage(m.poster_path, "w185");
                const playingThis = active && showVideo;
                return (
                  <li
                    key={mediaKey(m)}
                    className={clsx(
                      "flex min-h-0 items-center gap-1 rounded-lg pr-2 transition",
                      active ? "bg-accent/12 ring-1 ring-accent/60" : "hover:bg-surface-2",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        select(m);
                      }}
                      aria-pressed={active}
                      className="flex h-full min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-lg p-1.5 text-left"
                    >
                      {/* poster follows the cell height (desktop) / fixed (mobile) */}
                      <span className="relative aspect-[2/3] h-16 shrink-0 overflow-hidden rounded-md bg-surface-2 lg:h-full">
                        {img && (
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                        {playingThis && (
                          <span
                            className="absolute inset-0 grid place-items-center bg-black/45"
                            title={t("spotlight.nowPlaying")}
                          >
                            <PlayingBars className="text-white" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={clsx(
                            "line-clamp-2 text-sm font-semibold leading-snug",
                            active && "text-accent",
                          )}
                        >
                          {m.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                          {formatYear(m.release_date)}
                          {m.vote_average > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <StarIcon size={11} className="text-warning" />{" "}
                              {m.vote_average.toFixed(1)}
                            </span>
                          )}
                          {m.media_type === "tv" && <TvIcon size={12} />}
                        </span>
                      </span>
                    </button>
                    {/* play / stop the trailer per item */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleTrailer(m);
                      }}
                      aria-label={`${playingThis ? t("spotlight.stop") : t("spotlight.play")}: ${m.title}`}
                      title={playingThis ? t("spotlight.stop") : t("spotlight.play")}
                      className={clsx(
                        "grid size-9 shrink-0 place-items-center rounded-full transition",
                        playingThis
                          ? "bg-accent text-accent-fg"
                          : "border border-border text-muted hover:border-fg hover:text-fg",
                      )}
                    >
                      {playingThis ? <StopGlyph /> : <PlayIcon size={15} />}
                    </button>
                  </li>
                );
              })}
              {/* keep a fixed cell height on a short last page */}
              {Array.from({ length: PAGE_SIZE - pageItems.length }, (_, i) => (
                <li key={`empty-${i}`} aria-hidden="true" className="h-[4.75rem] lg:h-auto" />
              ))}
            </ul>

            {pageCount > 1 && (
              <nav
                aria-label={t("spotlight.pages")}
                className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                  }}
                  disabled={page === 0}
                  aria-label={t("spotlight.prev")}
                  className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeftIcon size={18} />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPage(i);
                      }}
                      aria-label={t("spotlight.page", { n: i + 1 })}
                      aria-current={i === page ? "page" : undefined}
                      className="group grid h-6 min-w-6 place-items-center"
                    >
                      <span
                        className={clsx(
                          "h-1.5 rounded-full transition-all",
                          i === page ? "w-5 bg-accent" : "w-1.5 bg-border group-hover:bg-muted",
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-1 text-xs tabular-nums text-muted">
                    {page + 1}/{pageCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.min(pageCount - 1, p + 1));
                  }}
                  disabled={page >= pageCount - 1}
                  aria-label={t("spotlight.next")}
                  className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRightIcon size={18} />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Items per page in the picker list */
const PAGE_SIZE = 5;
/** Max number of pages (20 items) */
const MAX_ITEMS = 20;

/** Layout: separate left frame + right list (desktop), stacked (mobile) */
const GRID =
  "grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]";
/** Background card for each block */
const CARD = "overflow-hidden rounded-2xl border border-border bg-surface shadow-card";

/** Stop icon (square) */
function StopGlyph() {
  return <span aria-hidden className="block size-3 rounded-[2px] bg-current" />;
}
