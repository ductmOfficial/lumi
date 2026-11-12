import { Link } from "react-router";
import { tmdbImage } from "@/lib/tmdb";
import { movieHref } from "@/lib/slug";
import { formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { InfoIcon, StarIcon } from "@/components/icons";
import { MovieActions } from "@/features/personalization/components/MovieActions";
import { useGenreNames, useMatchPercent } from "@/features/personalization/hooks";
import type { PreviewMovie } from "./store";
import { useMediaBriefText } from "@/features/media/brief";

/** Quick-look content shared by the hover card (desktop) and the bottom sheet (mobile). */
export function MoviePreviewContent({
  movie,
  onNavigate,
  compact,
}: {
  movie: PreviewMovie;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const match = useMatchPercent(movie.genre_ids);
  const genreNames = useGenreNames();
  const genres = movie.genre_ids
    .map((g) => genreNames.get(g))
    .filter(Boolean)
    .slice(0, 3);
  const href = movieHref(movie);
  const img = movie.backdrop_path ?? movie.poster_path;
  const brief = useMediaBriefText(movie, true);

  return (
    <div>
      <Link to={href} onClick={onNavigate} className="relative block aspect-video bg-surface-2">
        {img && (
          <img
            src={tmdbImage(img, movie.backdrop_path ? "w780" : "w500")}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent" />
        <h3 className="absolute bottom-2 left-3 right-3 line-clamp-2 text-lg font-bold drop-shadow">
          {movie.title}
        </h3>
      </Link>
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <MovieActions movie={movie} />
          <Link
            to={href}
            onClick={onNavigate}
            aria-label={t("common.details")}
            title={t("common.details")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-border hover:border-fg"
          >
            <InfoIcon size={18} />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {match !== null && (
            <span className="font-bold text-success">{t("match.percent", { n: match })}</span>
          )}
          <span className="inline-flex items-center gap-1 text-muted">
            <StarIcon size={12} className="text-warning" />
            {movie.vote_average.toFixed(1)}
          </span>
          <span className="text-muted">{formatYear(movie.release_date)}</span>
          {brief && <span className="rounded border border-border px-1 text-muted">{brief}</span>}
        </div>
        {genres.length > 0 && <p className="text-xs text-fg/80">{genres.join(" • ")}</p>}
        {!compact && movie.overview && (
          <p className="line-clamp-4 text-sm text-muted">{movie.overview}</p>
        )}
      </div>
    </div>
  );
}
