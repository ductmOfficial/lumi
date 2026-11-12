import { useMemo } from "react";
import { useAllGenres } from "@/features/discover/api/queries";
import { usePersonalization } from "./store";
import { genreAffinity, matchPercent } from "./engine";

/** Session timestamp — decay is per day, so drift within one session is negligible. */
const SESSION_NOW = Date.now();

/** Current genre scores (recomputed when new signals arrive). */
export function useAffinity() {
  const events = usePersonalization((s) => s.events);
  return useMemo(() => genreAffinity(events, SESSION_NOW), [events]);
}

export function useMatchPercent(genreIds: readonly number[] | undefined) {
  const aff = useAffinity();
  return genreIds ? matchPercent(genreIds, aff) : null;
}

export function useGenreNames() {
  const genres = useAllGenres();
  return useMemo(() => new Map(genres.map((g) => [g.id, g.name])), [genres]);
}
