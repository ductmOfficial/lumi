import { Navigate, useParams } from "react-router";
import { ErrorState } from "@/components/ErrorState";
import { LoadMore } from "@/components/LoadMore";
import { MovieGrid, MovieGridSkeleton } from "@/components/MovieGrid";
import { PageMeta } from "@/components/PageMeta";
import { useT } from "@/i18n/useT";
import { isMovieCategory, useMovieListInfinite, type MovieCategory } from "../api/queries";
import { CATEGORY_LABEL } from "../categories";

function CategoryList({ category }: { category: MovieCategory }) {
  const t = useT();
  const q = useMovieListInfinite(category);
  const movies = q.data?.pages.flatMap((p) => p.results) ?? [];
  const title = t(CATEGORY_LABEL[category]);

  return (
    <div className="mx-auto max-w-app space-y-6 px-4 sm:px-6 py-8">
      <PageMeta title={title} />
      <h1 className="text-2xl font-bold">{title}</h1>
      {q.isPending ? (
        <MovieGridSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <MovieGrid movies={movies} />
          <LoadMore
            hasNextPage={q.hasNextPage}
            isFetchingNextPage={q.isFetchingNextPage}
            fetchNextPage={() => q.fetchNextPage()}
          />
        </>
      )}
    </div>
  );
}

export function MovieListPage() {
  const { category } = useParams();
  if (!isMovieCategory(category)) return <Navigate to="/" replace />;
  return <CategoryList key={category} category={category} />;
}
