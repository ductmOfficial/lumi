import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { tmdbFetch, tmdbImage, type MovieSummary, type Video } from "@/lib/tmdb";
import { movieHref } from "@/lib/slug";
import { formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { useTmdbLocale } from "@/stores/preferences";
import { useCanHover, useMediaQuery, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { InfoIcon, StarIcon } from "@/components/icons";
import { pickTrailer } from "@/features/movies/utils";
import { MovieActions } from "./MovieActions";
import { useAffinity, useGenreNames } from "../hooks";
import { matchPercent } from "../engine";
import { useDislikedKeys } from "../store";
import { mediaKey } from "@/lib/slug";

const ROTATE_MS = 9000;
const TRAILER_DELAY_MS = 2500;

/** Background trailer (desktop): muted, autoplaying, looping YouTube — only on large screens, without reduced motion or data saver. */
function HeroTrailer({ movieId, media }: { movieId: number; media: "movie" | "tv" }) {
  const { language } = useTmdbLocale();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true);
    }, TRAILER_DELAY_MS);
    return () => {
      clearTimeout(t);
    };
  }, []);
  const videos = useQuery({
    queryKey: [media, "videos", movieId, language],
    queryFn: ({ signal }) =>
      tmdbFetch<{ results: Video[] }>(
        `/${media}/${movieId}/videos`,
        { language, include_video_language: `${language.slice(0, 2)},en,null` },
        signal,
      ),
    enabled: ready,
    staleTime: Infinity,
  });
  const trailer = videos.data ? pickTrailer(videos.data.results, language.slice(0, 2)) : undefined;
  const [visible, setVisible] = useState(false);
  if (!ready || !trailer) return null;
  const src = `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3`;
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* the 16:9 frame is ~25% wider than the hero → always covers it (21:9 hero) and crops YouTube's title/borders.
                    Only shown after the iframe loads + an extra delay to skip the black screen/spinner at startup. */}
      <iframe
        src={src}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        // The player is cross-origin (YouTube), so allow-same-origin only keeps its own origin.
        // eslint-disable-next-line @eslint-react/dom-no-unsafe-iframe-sandbox
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        onLoad={() =>
          setTimeout(() => {
            setVisible(true);
          }, 1200)
        }
        className={clsx(
          "absolute left-1/2 top-1/2 aspect-video w-[125%] -translate-x-1/2 -translate-y-1/2 border-0 transition-opacity duration-1000",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export function HeroCarousel({ candidates }: { candidates: MovieSummary[] | undefined }) {
  const t = useT();
  const aff = useAffinity();
  const disliked = useDislikedKeys();
  const genreNames = useGenreNames();
  const canHover = useCanHover();
  const isLarge = useMediaQuery("(min-width: 1024px)");
  const reducedMotion = usePrefersReducedMotion();
  const saveData =
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

  // Pick 5 titles with a backdrop, favoring ones that match the user's taste
  const slides = useMemo(() => {
    const pool = (candidates ?? [])
      .filter((m) => m.backdrop_path && !disliked.has(mediaKey(m)))
      .slice(0, 12);
    return pool
      .map((m, i) => ({ m, score: (matchPercent(m.genre_ids, aff) ?? 70) - i * 1.5 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.m);
  }, [candidates, aff, disliked]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[index % Math.max(slides.length, 1)];

  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => {
      clearTimeout(id);
    };
  }, [index, paused, reducedMotion, slides.length]);

  // swipe left/right on mobile
  const touchXRef = useRef<number | null>(null);

  if (!current)
    return (
      <div className="mx-auto max-w-app px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="aspect-[4/5] max-h-[78dvh] w-full animate-pulse rounded-2xl bg-surface sm:aspect-auto sm:h-[440px] lg:aspect-[21/9] lg:h-auto" />
      </div>
    );

  const match = matchPercent(current.genre_ids, aff);
  const genres = current.genre_ids
    .map((g) => genreNames.get(g))
    .filter(Boolean)
    .slice(0, 3);
  const showTrailer = isLarge && canHover && !reducedMotion && !saveData;

  return (
    // Card-style hero inside the container (like newer streaming apps): not full-bleed, rounded corners,
    // 21:9 on desktop so a 16:9 trailer covers it neatly.
    <div className="mx-auto max-w-app px-4 pt-3 sm:px-6 sm:pt-6">
      <section
        className="relative isolate aspect-[4/5] max-h-[78dvh] w-full overflow-hidden rounded-2xl bg-black text-white shadow-card sm:aspect-auto sm:h-[440px] lg:aspect-[21/9] lg:h-auto lg:max-h-[600px]"
        aria-roledescription="carousel"
        onMouseEnter={() => {
          setPaused(true);
        }}
        onMouseLeave={() => {
          setPaused(false);
        }}
        onFocus={() => {
          setPaused(true);
        }}
        onBlur={() => {
          setPaused(false);
        }}
        onTouchStart={(e) => (touchXRef.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchXRef.current;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null || Math.abs(end - start) < 50) return;
          setIndex((i) => (i + (end < start ? 1 : -1) + slides.length) % slides.length);
        }}
      >
        {/* Mobile: portrait poster as background; ≥sm: landscape backdrop */}
        <img
          key={`p-${mediaKey(current)}`}
          src={tmdbImage(current.poster_path, "w780")}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full animate-fade-in object-cover sm:hidden"
        />
        <img
          key={`b-${mediaKey(current)}`}
          src={tmdbImage(current.backdrop_path, "w1280")}
          srcSet={`${tmdbImage(current.backdrop_path, "w780")} 780w, ${tmdbImage(current.backdrop_path, "w1280")} 1280w, ${tmdbImage(current.backdrop_path, "original")} 1920w`}
          sizes="(min-width: 1280px) 1248px, 100vw"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-20 hidden h-full w-full animate-fade-in object-cover sm:block"
        />
        {showTrailer && (
          <HeroTrailer
            key={mediaKey(current)}
            movieId={current.id}
            media={current.media_type ?? "movie"}
          />
        )}
        {/* fixed dark overlay (theme-independent) so white text stays readable */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/75 via-black/25 to-transparent sm:block" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-center sm:max-w-2xl sm:p-10 sm:text-left lg:p-12">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:justify-start">
            {match !== null && (
              <span className="font-bold text-emerald-400">{t("match.percent", { n: match })}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <StarIcon size={14} className="text-amber-400" /> {current.vote_average.toFixed(1)}
            </span>
            <span className="text-white/80">{formatYear(current.release_date)}</span>
            {genres.length > 0 && <span className="text-white/80">{genres.join(" • ")}</span>}
          </div>
          <h1 className="text-3xl font-black leading-tight drop-shadow sm:text-4xl lg:text-5xl">
            {current.title}
          </h1>
          <p className="line-clamp-2 text-sm text-white/85 sm:line-clamp-3 sm:text-base">
            {current.overview}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Link
              to={movieHref(current)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/85"
            >
              <InfoIcon size={18} /> {t("common.details")}
            </Link>
            <MovieActions movie={current} />
          </div>
        </div>

        {slides.length > 1 && (
          <div
            className="absolute right-5 top-5 flex gap-1.5 sm:bottom-6 sm:right-6 sm:top-auto"
            role="tablist"
          >
            {slides.map((s, i) => (
              <button
                type="button"
                key={mediaKey(s)}
                role="tab"
                aria-selected={i === index}
                aria-label={s.title}
                onClick={() => {
                  setIndex(i);
                }}
                className="group grid h-6 min-w-6 place-items-center"
              >
                <span
                  className={clsx(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/45 group-hover:bg-white/75",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
