import { useRef } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { useT } from "@/i18n/useT";
import { Check } from "lucide-react";
import { useWatched } from "@/features/library/store";
import { tmdbImage } from "@/lib/tmdb";
import { movieHref } from "@/lib/slug";
import { formatYear } from "@/lib/format";
import { useCanHover } from "@/hooks/useMediaQuery";
import { useLongPress } from "@/hooks/useLongPress";
import {
  cancelHideHover,
  scheduleHideHover,
  usePreview,
  type PreviewMovie,
} from "@/features/preview/store";
import { useInView } from "@/hooks/useInView";
import { useMediaBriefText } from "@/features/media/brief";
import { Poster } from "./Poster";
import { TvIcon } from "./icons";
import { Rating } from "./Rating";

export type CardVariant = "poster" | "landscape" | "rank";

interface MovieCardProps {
  movie: PreviewMovie;
  variant?: CardVariant;
  rank?: number;
  priority?: boolean;
  /** secondary line under the title (default: year) */
  subtitle?: string;
  badge?: string;
}

/** The mouse must rest on a card this long before the quick look opens — skimming / clicking is not interrupted */
const HOVER_DELAY = 900;
/** A quick look is open (or just closed) → moving to the next card opens faster */
const HOVER_DELAY_WARM = 300;
const WARM_WINDOW = 600;
/** Moving the mouse beyond this threshold (px) restarts the wait */
const MOVE_TOLERANCE = 6;
let lastPreviewAt = 0;

/** Small icon marking series (instead of a text label) */
function SeriesMark({ className }: { className?: string }) {
  return (
    <span
      title="Series"
      className={clsx(
        "grid size-6 place-items-center rounded-full bg-black/65 text-white shadow backdrop-blur",
        className,
      )}
    >
      <TvIcon size={13} strokeWidth={2.2} />
      <span className="sr-only">Series</span>
    </span>
  );
}

/**
 * Movie card. Desktop: hover and rest ~0.9s → enlarged card (HoverPreview); clicking / dragging / scrolling cancels.
 * Mobile/tablet: long-press → quick-look bottom sheet.
 */
export function MovieCard({
  movie,
  variant = "poster",
  rank,
  priority,
  subtitle,
  badge,
}: MovieCardProps) {
  const canHover = useCanHover();
  const ref = useRef<HTMLAnchorElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const showHover = usePreview((s) => s.showHover);
  const openSheet = usePreview((s) => s.openSheet);
  const longPress = useLongPress(() => {
    openSheet(movie);
  });
  // runtime / season count: only fetched when the card is about to appear on screen
  const [viewRef, inView] = useInView<HTMLSpanElement>("200px");
  const brief = useMediaBriefText(movie, inView && variant !== "rank");
  const isTv = movie.media_type === "tv";
  const watched = useWatched(movie);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  const arm = () => {
    clear();
    const warm = !!usePreview.getState().hover || Date.now() - lastPreviewAt < WARM_WINDOW;
    timerRef.current = setTimeout(
      () => {
        if (!ref.current) return;
        showHover(movie, ref.current.getBoundingClientRect());
        lastPreviewAt = Date.now();
      },
      warm ? HOVER_DELAY_WARM : HOVER_DELAY,
    );
  };

  const hoverHandlers = canHover
    ? {
        onMouseEnter: (e: React.MouseEvent) => {
          cancelHideHover();
          anchorRef.current = { x: e.clientX, y: e.clientY };
          arm();
        },
        // the mouse is still moving → the user has not "stopped to look" → restart the wait
        onMouseMove: (e: React.MouseEvent) => {
          const a = anchorRef.current;
          if (!timerRef.current || !a) return;
          if (
            Math.abs(e.clientX - a.x) > MOVE_TOLERANCE ||
            Math.abs(e.clientY - a.y) > MOVE_TOLERANCE
          ) {
            anchorRef.current = { x: e.clientX, y: e.clientY };
            arm();
          }
        },
        // about to click / dragging the row / scrolling → no quick look
        onMouseDown: clear,
        onWheel: clear,
        onMouseLeave: () => {
          clear();
          if (usePreview.getState().hover) lastPreviewAt = Date.now();
          scheduleHideHover();
        },
      }
    : {};

  const common = {
    ref,
    to: movieHref(movie),
    title: movie.title,
    draggable: false,
    ...hoverHandlers,
    ...longPress,
  };

  if (variant === "landscape") {
    return (
      <Link {...common} className="group block select-none">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-2 transition group-hover:ring-2 group-hover:ring-accent">
          {(movie.backdrop_path || movie.poster_path) && (
            <img
              src={tmdbImage(
                movie.backdrop_path ?? movie.poster_path,
                movie.backdrop_path ? "w780" : "w342",
              )}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="absolute inset-x-3 bottom-2 text-white">
            <h3 className="line-clamp-1 text-sm font-bold">{movie.title}</h3>
            <p className="truncate text-xs text-white/75">
              <span ref={viewRef}>{subtitle ?? formatYear(movie.release_date)}</span>
              {brief && <span> · {brief}</span>}
            </p>
          </div>
          {badge && (
            <span className="absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg">
              {badge}
            </span>
          )}
          {watched && !badge && (
            <WatchedMark rating={watched.rating} className="absolute left-2 top-2" />
          )}
          {isTv && <SeriesMark className="absolute right-2 top-2" />}
        </div>
      </Link>
    );
  }

  if (variant === "rank") {
    // Every card has the same size: the poster always takes the right 62% of the width, the number sits behind in the left 38%.
    // Font size follows the card width (container query), so "1" or "10" never shifts the poster.
    return (
      <Link {...common} className="group @container relative block select-none pl-[38%]">
        {/* The number frame is as tall as the card and clips overflow: a large font with line-height < 1 no longer makes the row scroll vertically */}
        <span
          aria-hidden="true"
          className={clsx(
            "pointer-events-none absolute inset-y-0 z-0 flex items-end overflow-hidden",
            // 1–9: the number hugs the poster's left edge; 10: starts at the card's left edge, the "0" hidden behind the poster
            (rank ?? 0) >= 10 ? "left-0" : "right-[58%]",
          )}
        >
          {/*
            The number outline uses 2 stacked layers instead of text-stroke alone: variable fonts (Inter, SF…) have overlapping strokes
            so text-stroke reveals inner contours (diagonal marks at the foot of 2, 4…). Bottom layer: solid text + thick outline;
            top layer: background-colored text on top → only a clean outer outline remains.
          */}
          {/* pb: lift the number's foot slightly so the bottom outline is not clipped by the frame */}
          <span className="grid pb-[0.06em] text-[88cqw] font-black leading-[0.74] tracking-[-0.06em]">
            <span className="[grid-area:1/1] text-muted [-webkit-text-stroke:4px_var(--muted)]">
              {rank}
            </span>
            <span className="[grid-area:1/1] text-bg">{rank}</span>
          </span>
        </span>
        <Poster
          path={movie.poster_path}
          alt={movie.title}
          priority={priority}
          sizes="160px"
          className="relative z-10 w-full shadow-[-8px_0_16px_-6px_rgb(0_0_0/0.45)] transition group-hover:ring-2 group-hover:ring-accent"
        />
        {isTv && <SeriesMark className="absolute right-2 top-2 z-20" />}
      </Link>
    );
  }

  return (
    <Link {...common} className="group block select-none">
      <div className="relative">
        <Poster
          path={movie.poster_path}
          alt={movie.title}
          priority={priority}
          className="transition duration-200 group-hover:ring-2 group-hover:ring-accent"
        />
        <Rating value={movie.vote_average} className="absolute -bottom-3 left-2" />
        {watched && <WatchedMark rating={watched.rating} className="absolute -bottom-3 right-2" />}
        {badge && (
          <span className="absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg shadow">
            {badge}
          </span>
        )}
        {isTv && <SeriesMark className="absolute right-2 top-2" />}
      </div>
      <div className="mt-4 px-1 sm:mt-5">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug group-hover:text-accent sm:text-sm">
          {movie.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted">
          <span ref={viewRef}>{subtitle ?? formatYear(movie.release_date)}</span>
          {brief && <span> · {brief}</span>}
        </p>
      </div>
    </Link>
  );
}

/** "Watched" mark (with the personal rating, if any) */
function WatchedMark({ rating, className }: { rating?: number; className?: string }) {
  const t = useT();
  return (
    <span
      title={t("lib.watched")}
      className={clsx(
        "inline-flex h-6 items-center gap-0.5 rounded-full bg-success px-1.5 text-[11px] font-bold text-white shadow ring-2 ring-bg",
        className,
      )}
    >
      <Check size={12} strokeWidth={3} aria-hidden />
      {rating ? (
        <span className="tabular-nums">{rating}</span>
      ) : (
        <span className="sr-only">{t("lib.watched")}</span>
      )}
    </span>
  );
}

export function MovieCardSkeleton({ variant = "poster" }: { variant?: CardVariant }) {
  if (variant === "landscape")
    return <div className="aspect-video animate-pulse rounded-lg bg-surface-2" />;
  return (
    <div className="animate-pulse">
      <div
        className={clsx("aspect-[2/3] rounded-lg bg-surface-2", variant === "rank" && "ml-[38%]")}
      />
      {variant === "poster" && (
        <>
          <div className="mt-4 h-3 w-3/4 rounded bg-surface-2 sm:mt-5" />
          <div className="mt-2 h-3 w-1/3 rounded bg-surface-2" />
        </>
      )}
    </div>
  );
}
