import { useCallback, useEffect, useMemo, useState } from "react";
import { Library } from "lucide-react";
import { Outlet, useNavigate, useParams } from "react-router";
import clsx from "clsx";
import { NotFoundPage } from "@/app/layout/RouteError";
import { ErrorState } from "@/components/ErrorState";
import { PageMeta } from "@/components/PageMeta";
import { PlayIcon, StarIcon } from "@/components/icons";
import { ProfileLayout, type ProfileTab } from "@/components/profile/ProfileLayout";
import { MediaViewer } from "@/components/profile/MediaViewer";
import { imageItems, videoItems } from "@/components/profile/media";
import { isAiring, TmdbError, type MediaType, type MovieDetail, type Video } from "@/lib/tmdb";
import { parseIdParam } from "@/lib/slug";
import { formatNumber, formatRuntime, formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { MovieActions } from "@/features/personalization/components/MovieActions";
import { toLite } from "@/features/personalization/types";
import { WatchedControl } from "@/features/library/components/WatchedControl";
import { ReminderControl } from "@/features/library/components/ReminderControl";
import { MoreActions } from "@/features/library/components/MoreActions";
import { usePersonalization } from "@/features/personalization/store";
import { useMatchPercent } from "@/features/personalization/hooks";
import { useCollection, useTrendingMovies } from "../api/queries";
import { useMediaDetail } from "@/features/tv/api";
import { pickTrailer } from "../utils";
import type { MovieProfileContext } from "./context";

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-profile animate-pulse">
      <div className="aspect-[16/9] max-h-[420px] bg-surface-2 sm:aspect-[21/8] lg:rounded-b-xl" />
      <div className="flex flex-col items-center gap-4 px-4 sm:flex-row sm:items-end lg:px-8">
        <div className="-mt-24 aspect-[2/3] w-32 rounded-xl border-4 border-bg bg-surface-2 sm:w-40" />
        <div className="w-full flex-1 space-y-2 pb-2">
          <div className="mx-auto h-8 w-2/3 rounded bg-surface-2 sm:mx-0" />
          <div className="mx-auto h-4 w-1/3 rounded bg-surface-2 sm:mx-0" />
        </div>
      </div>
    </div>
  );
}

function certificationFor(movie: MovieDetail, region: string) {
  const entry = movie.release_dates.results.find((r) => r.iso_3166_1 === region);
  return entry?.release_dates.find((d) => d.certification)?.certification;
}

/** Shared profile page for movies (/movie/:movieId) and series (/tv/:tvId). */
export function MovieProfilePage({ type = "movie" }: { type?: MediaType }) {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const region = usePreferences((s) => s.region);
  const params = useParams();
  const id = parseIdParam(type === "tv" ? params.tvId : params.movieId);
  const { data: movie, isPending, error, refetch } = useMediaDetail(type, id);
  const trendingWeek = useTrendingMovies("week");
  const collection = useCollection(movie?.belongs_to_collection?.id ?? undefined);
  const navigate = useNavigate();
  const recordView = usePersonalization((s) => s.recordView);
  const recordTrailer = usePersonalization((s) => s.recordTrailer);
  const match = useMatchPercent(movie?.genres.map((g) => g.id));
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  // All images + videos of the title for the media viewer (shared by every tab)
  const mediaItems = useMemo(
    () =>
      movie
        ? [
            ...imageItems(movie.images.backdrops, t("photos.backdrops")),
            ...imageItems(movie.images.posters, t("photos.posters")),
            ...imageItems(movie.images.logos, t("photos.logos")),
            ...videoItems(
              [...movie.videos.results].sort((a, b) =>
                b.published_at.localeCompare(a.published_at),
              ),
              t("profile.tab.videos"),
            ),
          ]
        : [],
    [movie, t],
  );

  // Record a view (personalization signal) once the title data has loaded
  useEffect(() => {
    if (movie) recordView(movie);
  }, [movie, recordView]);

  const openMedia = useCallback(
    (itemId: string) => {
      const i = mediaItems.findIndex((m) => m.id === itemId);
      if (i >= 0) setMediaIndex(i);
    },
    [mediaItems],
  );
  const playVideo = useCallback(
    (v: Video) => {
      openMedia(`vid-${v.id}`);
    },
    [openMedia],
  );
  const recordVideoPlay = useCallback(() => {
    if (movie) recordTrailer(movie);
  }, [movie, recordTrailer]);

  if (!Number.isFinite(id)) return <NotFoundPage />;
  if (isPending) return <ProfileSkeleton />;
  if (error) {
    if (error instanceof TmdbError && error.status === 404) return <NotFoundPage />;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const trailer = pickTrailer(movie.videos.results, locale);
  const lite = toLite(movie);
  const upcomingDate = movie.release_date && movie.release_date > today ? movie.release_date : null;
  const rank =
    type === "movie" ? (trendingWeek.data?.results.findIndex((m) => m.id === movie.id) ?? -1) : -1;
  const tv = movie.tv;
  const airing = tv ? isAiring(tv) : false;
  const tvYears = tv
    ? `${formatYear(tv.first_air_date)}–${airing ? t("tv.present") : formatYear(tv.last_air_date)}`
    : null;
  const cert = certificationFor(movie, region);
  const runtime = formatRuntime(movie.runtime);
  const parts = [...(collection.data?.parts ?? [])].sort((a, b) =>
    (a.release_date || "9999").localeCompare(b.release_date || "9999"),
  );
  const partIndex = parts.findIndex((p) => p.id === movie.id);
  const collectionPart =
    partIndex >= 0 ? t("collection.part", { i: partIndex + 1, n: parts.length }) : null;
  const covers = [movie.backdrop_path, ...movie.images.backdrops.map((b) => b.file_path)]
    .filter((p, i, arr): p is string => !!p && arr.indexOf(p) === i)
    .slice(0, 10);

  const tabs: ProfileTab[] = [
    { to: "", label: t("profile.tab.timeline") },
    { to: "about", label: t("profile.tab.about") },
    // series: Seasons tab (stays active on /seasons/:n too)
    ...(tv
      ? [{ to: "seasons", label: t("tv.tab.seasons"), count: tv.number_of_seasons, end: false }]
      : []),
    { to: "cast", label: t("profile.tab.cast"), count: movie.credits.cast.length },
    {
      to: "photos",
      label: t("profile.tab.photos"),
      count: movie.images.backdrops.length + movie.images.posters.length,
    },
    { to: "videos", label: t("profile.tab.videos"), count: movie.videos.results.length },
    { to: "reviews", label: t("profile.tab.reviews") },
    { to: "similar", label: t("profile.tab.similar") },
  ];

  const context: MovieProfileContext = { movie, openMedia, playVideo, recordVideoPlay };

  return (
    <>
      <PageMeta
        title={`${movie.title} (${tvYears ?? formatYear(movie.release_date)})`}
        description={movie.overview}
      />
      <ProfileLayout
        covers={covers}
        avatar={{ path: movie.poster_path, alt: movie.title, shape: "poster" }}
        title={movie.title}
        badge={
          tv && (
            // airing status, like Facebook's "online" dot
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
                airing ? "bg-success/15 text-success" : "bg-surface-2 text-muted",
              )}
            >
              <span
                className={clsx(
                  "h-2 w-2 rounded-full",
                  airing ? "animate-pulse bg-success" : "bg-muted",
                )}
              />
              {airing ? t("tv.airing") : t("tv.ended")}
            </span>
          )
        }
        subtitle={
          <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
            <span>{tvYears ?? formatYear(movie.release_date)}</span>
            {cert && <span className="rounded border border-muted/60 px-1 text-xs">{cert}</span>}
            {tv && (
              <span>
                · {t("tv.seasons", { n: tv.number_of_seasons })} ·{" "}
                {t("tv.episodes", { n: tv.number_of_episodes })}
              </span>
            )}
            {tv && tv.networks.length > 0 && (
              <span>· {tv.networks.map((n) => n.name).join(", ")}</span>
            )}
            {!tv && runtime && <span>· {runtime}</span>}
            {movie.genres.length > 0 && <span>· {movie.genres.map((g) => g.name).join(", ")}</span>}
          </span>
        }
        stats={
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
            <span className="inline-flex items-center gap-1">
              <StarIcon size={14} className="text-warning" />
              {movie.vote_average.toFixed(1)}
              <span className="font-normal text-muted">
                ({t("common.votes", { n: formatNumber(movie.vote_count, locale) })})
              </span>
            </span>
            {match !== null && (
              <span className="text-success">{t("match.percent", { n: match })}</span>
            )}
            {rank >= 0 && (
              <span className="text-accent">{t("profile.trendingRank", { n: rank + 1 })}</span>
            )}
            {movie.belongs_to_collection && (
              // Collection: highlighted chip in the header → jumps to the Collection card in the About column
              <button
                type="button"
                onClick={() => {
                  void navigate(".", { preventScrollReset: true });
                  setTimeout(
                    () =>
                      document
                        .getElementById("collection")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                    120,
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent hover:bg-accent/25"
              >
                <Library aria-hidden className="size-3.5 shrink-0" />{" "}
                {collection.data?.name ?? movie.belongs_to_collection.name}
                {collectionPart && (
                  <span className="font-semibold opacity-80">· {collectionPart}</span>
                )}
              </button>
            )}
          </span>
        }
        actions={
          // mobile: one row — the List button stretches, the others are icon-only
          <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap sm:justify-center">
            <MovieActions
              movie={{ ...movie, genre_ids: movie.genres.map((g) => g.id) }}
              variant="labeled"
              className="contents"
            />
            {/* upcoming → reminder; released → mark as watched + rating */}
            {upcomingDate ? (
              <ReminderControl movie={lite} date={upcomingDate} />
            ) : (
              <WatchedControl movie={lite} />
            )}
            {trailer && (
              <button
                type="button"
                onClick={() => {
                  playVideo(trailer);
                }}
                aria-label={t("movie.trailer")}
                className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold hover:bg-border sm:px-4"
              >
                <PlayIcon size={16} />{" "}
                <span className="hidden sm:inline">{t("movie.trailer")}</span>
              </button>
            )}
            <MoreActions movie={lite} />
          </div>
        }
        tabs={tabs}
      >
        <Outlet context={context} />
      </ProfileLayout>

      <MediaViewer
        items={mediaItems}
        index={mediaIndex}
        onIndexChange={setMediaIndex}
        title={movie.title}
        onVideoPlay={recordVideoPlay}
      />
    </>
  );
}

/** Route /tv/:tvId */
export function TvProfilePage() {
  return <MovieProfilePage type="tv" />;
}
