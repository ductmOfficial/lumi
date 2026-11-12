import type { MovieSummary, PersonDetail } from "@/lib/tmdb";
import { mediaKey } from "@/lib/slug";

/** One title in this person's career, merging roles (acting + directing + writing …). */
export interface PersonCredit {
  movie: MovieSummary;
  roles: string[];
  isCast: boolean;
}

export function mergeCredits(person: PersonDetail): PersonCredit[] {
  // keyed by mediaKey: movies & series can share ids
  const map = new Map<string, PersonCredit>();
  for (const c of person.movie_credits.cast) {
    const cur = map.get(mediaKey(c)) ?? { movie: c, roles: [], isCast: false };
    cur.isCast = true;
    if (c.character && !cur.roles.includes(c.character)) cur.roles.push(c.character);
    map.set(mediaKey(c), cur);
  }
  for (const c of person.movie_credits.crew) {
    const cur = map.get(mediaKey(c)) ?? { movie: c, roles: [], isCast: false };
    if (c.job && !cur.roles.includes(c.job)) cur.roles.push(c.job);
    map.set(mediaKey(c), cur);
  }
  return [...map.values()];
}

export type LifeEvent =
  | { id: string; kind: "upcoming"; date: string; credits: PersonCredit[] }
  | { id: string; kind: "birth"; date: string; place: string | null }
  | { id: string; kind: "death"; date: string }
  | { id: string; kind: "debut"; date: string; credit: PersonCredit }
  | { id: string; kind: "breakout"; date: string; credit: PersonCredit }
  | { id: string; kind: "year"; date: string; year: number; credits: PersonCredit[] };

/**
 * Facebook-style "life events": birth, first role, best-known role,
 * titles per year, upcoming projects (pinned), death.
 */
export function buildLifeEvents(person: PersonDetail, now: Date): LifeEvent[] {
  const credits = mergeCredits(person);
  // drop junk credits: no date, or barely known (unless the title is upcoming)
  const today = now.toISOString().slice(0, 10);
  const dated = credits
    .filter((c) => c.movie.release_date)
    .sort((a, b) => a.movie.release_date.localeCompare(b.movie.release_date));
  const released = dated.filter((c) => c.movie.release_date <= today);
  const upcoming = dated.filter((c) => c.movie.release_date > today);
  const events: LifeEvent[] = [];

  const nextUp = upcoming[0];
  if (nextUp)
    events.push({
      id: "upcoming",
      kind: "upcoming",
      date: nextUp.movie.release_date,
      credits: upcoming,
    });
  if (person.deathday) events.push({ id: "death", kind: "death", date: person.deathday });
  if (person.birthday)
    events.push({
      id: "birth",
      kind: "birth",
      date: person.birthday,
      place: person.place_of_birth,
    });

  const debut = released[0];
  if (debut)
    events.push({ id: "debut", kind: "debut", date: debut.movie.release_date, credit: debut });
  const breakout = [...released].sort((a, b) => b.movie.vote_count - a.movie.vote_count)[0];
  if (breakout && breakout !== debut && breakout.movie.vote_count > 50) {
    events.push({
      id: "breakout",
      kind: "breakout",
      date: breakout.movie.release_date,
      credit: breakout,
    });
  }

  const byYear = new Map<number, PersonCredit[]>();
  for (const c of released) {
    const y = Number(c.movie.release_date.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), c]);
  }
  for (const [year, list] of byYear) {
    events.push({
      id: `year-${year}`,
      kind: "year",
      date: `${year}-12-31`,
      year,
      credits: list.sort((a, b) => b.movie.popularity - a.movie.popularity),
    });
  }

  const order: Record<LifeEvent["kind"], number> = {
    upcoming: 0,
    death: 1,
    breakout: 2,
    year: 3,
    debut: 4,
    birth: 5,
  };
  return events.sort((a, b) => {
    if (a.kind === "upcoming") return -1;
    if (b.kind === "upcoming") return 1;
    return b.date.localeCompare(a.date) || order[a.kind] - order[b.kind];
  });
}
