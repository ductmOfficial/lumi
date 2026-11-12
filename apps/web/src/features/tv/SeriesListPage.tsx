import { Navigate, useParams } from "react-router";
import { ErrorState } from "@/components/ErrorState";
import { LoadMore } from "@/components/LoadMore";
import { MovieGrid, MovieGridSkeleton } from "@/components/MovieGrid";
import { PageMeta } from "@/components/PageMeta";
import { useT } from "@/i18n/useT";
import type { MessageKey } from "@lumi/i18n";
import { TV_CATEGORIES, useTvListInfinite, type TvCategory } from "./api";

const TITLE: Record<TvCategory, MessageKey> = {
  on_the_air: "rows.tvOnAir",
  airing_today: "rows.tvAiringToday",
  popular: "rows.tvPopular",
  top_rated: "rows.tvTopRated",
};

function List({ category }: { category: TvCategory }) {
  const t = useT();
  const q = useTvListInfinite(category);
  const items = q.data?.pages.flatMap((p) => p.results) ?? [];
  return (
    <div className="mx-auto max-w-app space-y-6 px-4 sm:px-6 py-8">
      <PageMeta title={t(TITLE[category])} />
      <h1 className="text-2xl font-bold">{t(TITLE[category])}</h1>
      {q.isPending ? (
        <MovieGridSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <MovieGrid movies={items} />
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

/** /series/:category — full series list (infinite scroll) */
export function SeriesListPage() {
  const { category } = useParams();
  if (!(TV_CATEGORIES as readonly string[]).includes(category ?? ""))
    return <Navigate to="/series" replace />;
  return <List key={category} category={category as TvCategory} />;
}
