import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/ErrorState";
import { LoadMore } from "@/components/LoadMore";
import { MovieGrid, MovieGridSkeleton } from "@/components/MovieGrid";
import { PageMeta } from "@/components/PageMeta";
import { useT } from "@/i18n/useT";
import { useSearchMedia, useSearchPeople } from "../api/queries";
import { PersonGrid, PersonGridSkeleton } from "../components/PersonGrid";
import { KeywordSuggestions } from "../components/KeywordSuggestions";
import { useSearchInput } from "../useSearchInput";
import { Segmented } from "@/components/Segmented";
import type { MediaType } from "@/lib/tmdb";

type SearchType = MediaType | "person";

export function SearchPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const rawType = params.get("type");
  const type: SearchType = rawType === "tv" || rawType === "person" ? rawType : "movie";
  const media: MediaType = type === "tv" ? "tv" : "movie";
  const { input, setInput } = useSearchInput(true);

  const mediaQ = useSearchMedia(type === "person" ? "" : urlQuery, media);
  const peopleQ = useSearchPeople(urlQuery, type === "person");
  const q = type === "person" ? peopleQ : mediaQ;
  const setType = (next: SearchType) => {
    const sp = new URLSearchParams(params);
    if (next !== "movie") sp.set("type", next);
    else sp.delete("type");
    setParams(sp, { replace: true });
  };
  const movies = mediaQ.data?.pages.flatMap((p) => p.results) ?? [];
  const people = peopleQ.data?.pages.flatMap((p) => p.results) ?? [];
  const count = type === "person" ? people.length : movies.length;

  return (
    <div className="mx-auto max-w-app space-y-6 px-4 sm:px-6 py-8">
      <PageMeta title={urlQuery ? t("search.resultsFor", { q: urlQuery }) : t("search.title")} />
      <input
        type="search"
        autoFocus
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
        }}
        placeholder={t("search.placeholder")}
        aria-label={t("nav.search")}
        className="w-full rounded-xl border border-border bg-surface px-5 py-3 text-lg placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <Segmented<SearchType>
        ariaLabel={t("nav.search")}
        value={type}
        onChange={setType}
        options={[
          { value: "movie", label: t("search.movies") },
          { value: "tv", label: t("search.tv") },
          { value: "person", label: t("search.people") },
        ]}
      />

      {urlQuery && <KeywordSuggestions query={urlQuery} media={media} />}

      {!urlQuery ? (
        <p className="text-muted">{t("search.prompt")}</p>
      ) : q.isPending ? (
        type === "person" ? (
          <PersonGridSkeleton />
        ) : (
          <MovieGridSkeleton />
        )
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : count === 0 ? (
        <p className="text-muted">{t("search.empty")}</p>
      ) : (
        <>
          <h1 className="text-lg font-semibold">{t("search.resultsFor", { q: urlQuery })}</h1>
          {type === "person" ? <PersonGrid people={people} /> : <MovieGrid movies={movies} />}
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
