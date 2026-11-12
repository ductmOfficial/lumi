import type { WatchedEntry, ShowProgress, UserList, GameStats } from "@/features/library/store";

export type BadgeId =
  | "first"
  | "cinephile"
  | "marathon"
  | "horror"
  | "animation"
  | "scifi"
  | "romance"
  | "decades"
  | "binge"
  | "critic"
  | "curator"
  | "streak";

export interface Badge {
  id: BadgeId;
  current: number;
  target: number;
  earned: boolean;
}

interface Input {
  watched: WatchedEntry[];
  progress: ShowProgress[];
  lists: UserList[];
  game: GameStats;
}

const countGenre = (w: WatchedEntry[], id: number) =>
  w.filter((e) => e.movie.genre_ids.includes(id)).length;

/** Badges are computed entirely from on-device data (no AI, just rule-based counting) */
export function computeBadges({ watched, progress, lists, game }: Input): Badge[] {
  const decades = new Set(watched.map((e) => e.movie.release_date.slice(0, 3)).filter(Boolean))
    .size;
  const episodes = progress.reduce((s, p) => s + p.seen.length, 0);
  const rated = watched.filter((e) => e.rating).length;
  const raw: [BadgeId, number, number][] = [
    ["first", watched.length, 1],
    ["cinephile", watched.length, 25],
    ["marathon", watched.length, 100],
    ["horror", countGenre(watched, 27), 10],
    ["animation", countGenre(watched, 16), 10],
    ["scifi", countGenre(watched, 878) + countGenre(watched, 10765), 10],
    ["romance", countGenre(watched, 10749), 10],
    ["decades", decades, 5],
    ["binge", episodes, 50],
    ["critic", rated, 20],
    ["curator", lists.filter((l) => l.items.length >= 3).length, 3],
    ["streak", game.bestStreak, 7],
  ];
  return raw.map(([id, current, target]) => ({
    id,
    current: Math.min(current, target),
    target,
    earned: current >= target,
  }));
}

export interface Wrapped {
  year: number;
  movies: number;
  series: number;
  episodes: number;
  avgRating: number | null;
  topGenres: { id: number; count: number }[];
  topDecade: string | null;
  favorite: WatchedEntry | null;
  busiestMonth: number | null;
}

/** Year in review: only counts titles marked as watched in that year */
export function computeWrapped(
  watched: WatchedEntry[],
  progress: ShowProgress[],
  year: number,
): Wrapped {
  const inYear = watched.filter((e) => new Date(e.at).getFullYear() === year);
  const genres = new Map<number, number>();
  const decades = new Map<string, number>();
  const months = new Map<number, number>();
  for (const e of inYear) {
    e.movie.genre_ids.forEach((g) => genres.set(g, (genres.get(g) ?? 0) + 1));
    const d = e.movie.release_date.slice(0, 3);
    if (d) decades.set(`${d}0s`, (decades.get(`${d}0s`) ?? 0) + 1);
    const m = new Date(e.at).getMonth();
    months.set(m, (months.get(m) ?? 0) + 1);
  }
  const rated = inYear.filter((e) => e.rating);
  const top = <K>(m: Map<K, number>) => [...m].sort((a, b) => b[1] - a[1]);
  return {
    year,
    movies: inYear.filter((e) => e.movie.media_type !== "tv").length,
    series: inYear.filter((e) => e.movie.media_type === "tv").length,
    episodes: progress
      .filter((p) => new Date(p.at).getFullYear() === year)
      .reduce((s, p) => s + p.seen.length, 0),
    avgRating: rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null,
    topGenres: top(genres)
      .slice(0, 3)
      .map(([id, count]) => ({ id, count })),
    topDecade: top(decades)[0]?.[0] ?? null,
    favorite:
      [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.at - a.at)[0] ?? null,
    busiestMonth: top(months)[0]?.[0] ?? null,
  };
}
