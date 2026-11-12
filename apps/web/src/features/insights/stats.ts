/** Pure statistics (no ML/AI) for the Insights page — easy to test. */
import type { MovieSummary } from "@/lib/tmdb";
import { canonicalGenres, type Affinity } from "@/features/personalization/engine";
import type { SignalEvent, SignalType } from "@/features/personalization/types";

const DAY = 86_400_000;

export interface GenreRow {
  genreId: number;
  movie: number;
  tv: number;
  total: number;
}

/** Counts genres of movies & series (TV genres map to the matching movie genres). */
export function genreBreakdown(items: MovieSummary[], limit = 10): GenreRow[] {
  const map = new Map<number, GenreRow>();
  for (const m of items) {
    for (const g of canonicalGenres(m.genre_ids)) {
      const row = map.get(g) ?? { genreId: g, movie: 0, tv: 0, total: 0 };
      if (m.media_type === "tv") row.tv++;
      else row.movie++;
      row.total++;
      map.set(g, row);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.total - a.total || a.genreId - b.genreId)
    .slice(0, limit);
}

export interface DecadeRow {
  decade: number;
  count: number;
  avgRating: number;
}

export function decadeStats(items: MovieSummary[]): DecadeRow[] {
  const map = new Map<number, { count: number; sum: number }>();
  for (const m of items) {
    const y = Number(m.release_date.slice(0, 4));
    if (!y) continue;
    const d = Math.floor(y / 10) * 10;
    const cur = map.get(d) ?? { count: 0, sum: 0 };
    cur.count++;
    cur.sum += m.vote_average;
    map.set(d, cur);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, v]) => ({ decade, count: v.count, avgRating: v.sum / v.count }));
}

export const average = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/** Share (%) released within the last `days` days */
export function recentShare(items: MovieSummary[], now: Date, days = 90) {
  if (!items.length) return 0;
  const from = now.getTime() - days * DAY;
  const recent = items.filter((m) => {
    const t = Date.parse(m.release_date);
    return Number.isFinite(t) && t >= from && t <= now.getTime();
  });
  return Math.round((recent.length / items.length) * 100);
}

export interface ActivityDay {
  date: string;
  total: number;
  byType: Partial<Record<SignalType, number>>;
}

/** Interactions per day over the last `days` days (including days with none). */
export function activityByDay(events: SignalEvent[], now: Date, days = 30): ActivityDay[] {
  const out: ActivityDay[] = [];
  const index = new Map<string, ActivityDay>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    const row = { date: key, total: 0, byType: {} };
    out.push(row);
    index.set(key, row);
  }
  for (const e of events) {
    if (e.type === "onboard") continue;
    const row = index.get(new Date(e.at).toISOString().slice(0, 10));
    if (!row) continue;
    row.total++;
    row.byType[e.type] = (row.byType[e.type] ?? 0) + 1;
  }
  return out;
}

/** Genre scores normalized to 0–100 (positive scores only) */
export function affinityTop(aff: Affinity, n = 8) {
  const entries = [...aff.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
  const max = entries[0]?.[1] ?? 1;
  return entries.map(([genreId, s]) => ({ genreId, score: Math.round((s / max) * 100) }));
}
