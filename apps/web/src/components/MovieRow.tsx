import { useRef, useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import type { PreviewMovie } from "@/features/preview/store";
import { useT } from "@/i18n/useT";
import { useCanHover } from "@/hooks/useMediaQuery";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { MovieCard, MovieCardSkeleton, type CardVariant } from "./MovieCard";
import { ErrorState } from "./ErrorState";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

interface MovieRowProps {
  title: ReactNode;
  /** small line explaining why this row exists */
  reason?: ReactNode;
  movies: PreviewMovie[] | undefined;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  seeAllTo?: string;
  /** secondary button to the right of the title (e.g. change layout) */
  headerExtra?: ReactNode;
  actions?: ReactNode;
  variant?: CardVariant;
  subtitleFor?: (m: PreviewMovie) => string | undefined;
  /** small label at the card's top-left (e.g. "3 days left") */
  badgeFor?: (m: PreviewMovie) => string | undefined;
  /** large: bigger posters for special rows (mobile ~2.5 cards) */
  layout?: "default" | "large";
}

/*
 * Mobile (<640px): the number of visible cards is fixed per type, with half of the last card showing as a swipe hint.
 * Visible area = content (100%) + 1rem left margin; each card takes w + gap (0.75rem):
 *   n cards ⇒ w = (100% + 1rem) / n − 0.75rem
 */
const ITEM_WIDTH: Record<CardVariant | "large", string> = {
  // ~3.5 cards
  poster: "w-[calc((100%+1rem)/3.5-0.75rem)] sm:w-40 lg:w-44",
  // landscape & rank cards: ~2.5 cards (smaller makes landscape images / rank numbers hard to read)
  landscape: "w-[calc((100%+1rem)/2.5-0.75rem)] sm:w-72",
  rank: "w-[calc((100%+1rem)/2.5-0.75rem)] sm:w-60 lg:w-64",
  // large posters for special rows: ~2.5 cards
  large: "w-[calc((100%+1rem)/2.5-0.75rem)] sm:w-52 lg:w-60",
};

/** Row header: name + secondary button + reason + "See all" (shared by every row type) */
export function RowHeader({
  title,
  reason,
  actions,
  seeAllTo,
  headerExtra,
}: Pick<MovieRowProps, "title" | "reason" | "actions" | "seeAllTo" | "headerExtra">) {
  const t = useT();
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-base font-bold sm:text-xl">{title}</h2>
          {actions}
        </div>
        {!!reason && <p className="mt-0.5 text-xs text-muted">{reason}</p>}
      </div>
      {(!!seeAllTo || !!headerExtra) && (
        // Group the row's buttons into one icon group: [change layout] | [see all]
        <div className="inline-flex shrink-0 items-center rounded-full border border-border p-0.5">
          {headerExtra}
          {!!headerExtra && seeAllTo && <span aria-hidden className="mx-1 h-4 w-px bg-border" />}
          {seeAllTo && (
            <Link
              to={seeAllTo}
              aria-label={t("common.seeAll")}
              title={t("common.seeAll")}
              className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-accent"
            >
              <ArrowRightIcon size={16} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontally scrolling row: swipe on mobile, arrow buttons on desktop. */
export function MovieRow({
  title,
  reason,
  movies,
  isLoading,
  error,
  onRetry,
  seeAllTo,
  actions,
  headerExtra,
  variant = "poster",
  subtitleFor,
  badgeFor,
  layout = "default",
}: MovieRowProps) {
  const itemWidth =
    variant === "poster" && layout === "large" ? ITEM_WIDTH.large : ITEM_WIDTH[variant];
  const canHover = useCanHover();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  // large rows: mouse drag + arrow buttons only; the wheel is left alone so page scrolling stays natural
  useHorizontalScroll(scrollerRef, { wheel: false });

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };
  useEffect(updateEdges, [movies]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/row space-y-2 sm:space-y-3">
      <RowHeader
        title={title}
        reason={reason}
        actions={actions}
        seeAllTo={seeAllTo}
        headerExtra={headerExtra}
      />
      {error ? (
        <ErrorState error={error} onRetry={onRetry} compact />
      ) : (
        <div className="relative">
          <div
            ref={scrollerRef}
            onScroll={updateEdges}
            className={clsx(
              // mobile: bleeds to the screen edge; ≥sm: aligned to the content edge so every row (featured ones too) has the same length
              "scrollbar-none -mx-4 flex gap-3 overflow-x-auto overflow-y-hidden scroll-px-4 px-4 sm:mx-0 sm:scroll-px-0 sm:px-0 pb-1 sm:pb-2 sm:gap-4 pointer-coarse:snap-x pointer-coarse:snap-mandatory",
              variant === "poster" && "pb-3",
            )}
          >
            {isLoading || !movies
              ? Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className={clsx("shrink-0", itemWidth)}>
                    <MovieCardSkeleton variant={variant} />
                  </div>
                ))
              : movies.map((m, i) => (
                  <div key={m.id} className={clsx("shrink-0 pointer-coarse:snap-start", itemWidth)}>
                    <MovieCard
                      movie={m}
                      variant={variant}
                      rank={i + 1}
                      subtitle={subtitleFor?.(m)}
                      badge={badgeFor?.(m)}
                    />
                  </div>
                ))}
          </div>
          {canHover && movies && movies.length > 0 && (
            <>
              {!edges.start && (
                <button
                  type="button"
                  onClick={() => {
                    scrollBy(-1);
                  }}
                  aria-label="Previous"
                  className="absolute left-0 top-0 bottom-2 hidden w-12 items-center justify-center bg-gradient-to-r from-bg to-transparent opacity-0 transition group-hover/row:opacity-100 sm:flex"
                >
                  <ChevronLeftIcon size={28} />
                </button>
              )}
              {!edges.end && (
                <button
                  type="button"
                  onClick={() => {
                    scrollBy(1);
                  }}
                  aria-label="Next"
                  className="absolute right-0 top-0 bottom-2 hidden w-12 items-center justify-center bg-gradient-to-l from-bg to-transparent opacity-0 transition group-hover/row:opacity-100 sm:flex"
                >
                  <ChevronRightIcon size={28} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
