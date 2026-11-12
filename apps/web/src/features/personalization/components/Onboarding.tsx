import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Sheet } from "@/components/Sheet";
import { Poster } from "@/components/Poster";
import { CheckIcon } from "@/components/icons";
import { useT } from "@/i18n/useT";
import { useTmdbLocale } from "@/stores/preferences";
import { useMovieGenres } from "@/features/discover/api/queries";
import { trendingMoviesQuery } from "@/features/movies/api/queries";
import type { MovieSummary } from "@/lib/tmdb";
import { usePersonalization } from "../store";

const MIN_PICKS = 3;

/** First visit: pick genres + favorite titles to get recommendations right away (like most streaming apps). */
export function Onboarding() {
  const t = useT();
  const { language } = useTmdbLocale();
  const status = usePersonalization((s) => s.onboarding.status);
  const complete = usePersonalization((s) => s.completeOnboarding);
  const skip = usePersonalization((s) => s.skipOnboarding);
  const genres = useMovieGenres();
  const popular = useQuery({
    ...trendingMoviesQuery("week", language),
    enabled: status === "pending",
  });
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [movies, setMovies] = useState<MovieSummary[]>([]);

  if (status !== "pending") return null;
  const picks = genreIds.length + movies.length;

  const toggleGenre = (id: number) => {
    setGenreIds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  };
  const toggleMovie = (m: MovieSummary) => {
    setMovies((list) =>
      list.some((x) => x.id === m.id) ? list.filter((x) => x.id !== m.id) : [...list, m],
    );
  };

  return (
    <Sheet
      open
      onClose={skip}
      size="lg"
      title={t("onboarding.title")}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={skip} className="text-sm text-muted hover:text-fg">
            {t("onboarding.skip")}
          </button>
          <button
            type="button"
            disabled={picks < MIN_PICKS}
            onClick={() => {
              complete(genreIds, movies);
            }}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-accent-fg disabled:opacity-40"
          >
            {picks < MIN_PICKS
              ? t("onboarding.pickMore", { n: MIN_PICKS - picks })
              : t("onboarding.done")}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted">{t("onboarding.subtitle")}</p>
      <h3 className="mb-2 text-sm font-semibold">{t("discover.genres")}</h3>
      <div className="mb-6 flex flex-wrap gap-2">
        {genres.data?.map((g) => {
          const on = genreIds.includes(g.id);
          return (
            <button
              type="button"
              key={g.id}
              aria-pressed={on}
              onClick={() => {
                toggleGenre(g.id);
              }}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-sm transition",
                on ? "border-accent bg-accent text-accent-fg" : "border-border hover:border-fg",
              )}
            >
              {g.name}
            </button>
          );
        })}
      </div>
      <h3 className="mb-2 text-sm font-semibold">{t("onboarding.movies")}</h3>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {popular.data?.results.slice(0, 15).map((m) => {
          const on = movies.some((x) => x.id === m.id);
          return (
            <button
              type="button"
              key={m.id}
              aria-pressed={on}
              onClick={() => {
                toggleMovie(m);
              }}
              className="relative text-left"
              title={m.title}
            >
              <Poster
                path={m.poster_path}
                alt={m.title}
                sizes="120px"
                className={clsx("transition", on && "ring-4 ring-accent")}
              />
              {on && (
                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg">
                  <CheckIcon size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
