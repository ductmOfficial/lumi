import type { PreviewMovie } from "@/features/preview/store";
import { mediaKey } from "@/lib/slug";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";

/** Pages of results can repeat a title; keep the first one. */
function uniqueByKey(movies: PreviewMovie[]) {
  const seen = new Set<string>();
  return movies.filter((m) => {
    const key = mediaKey(m);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const GRID =
  "grid grid-cols-2 gap-x-3 gap-y-6 min-[480px]:grid-cols-3 md:grid-cols-4 md:gap-x-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8";

export function MovieGrid({
  movies,
  badgeFor,
}: {
  movies: PreviewMovie[];
  badgeFor?: (m: PreviewMovie) => string | undefined;
}) {
  return (
    <div className={GRID}>
      {uniqueByKey(movies).map((m, i) => (
        <MovieCard key={mediaKey(m)} movie={m} priority={i < 6} badge={badgeFor?.(m)} />
      ))}
    </div>
  );
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
