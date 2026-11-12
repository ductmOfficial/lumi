import type { MovieSummary } from "@/lib/tmdb";

/** Seeded RNG (mulberry32) — the daily challenge is identical for everyone */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(arr: T[], rnd: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const ai = a[i] as T;
    a[i] = a[j] as T;
    a[j] = ai;
  }
  return a;
}

export type RoundKind = "image" | "year";

export interface Round {
  kind: RoundKind;
  movie: MovieSummary;
  /** answer: the title (image) or the year (year) */
  options: string[];
  answer: string;
}

/** Max points per question type: image 3 (minus 1 per hint), year 2 */
export const MAX_POINTS: Record<RoundKind, number> = { image: 3, year: 2 };

export const yearOf = (m: MovieSummary) => m.release_date.slice(0, 4);

/** Builds the question set from the pool; distractors are distinct and differ from the answer */
export function buildRounds(pool: MovieSummary[], kinds: RoundKind[], rnd: () => number): Round[] {
  const usable = pool.filter((m) => m.backdrop_path && m.poster_path && yearOf(m));
  const picked = shuffle(usable, rnd).slice(0, kinds.length);
  return picked.map((movie, i) => {
    const kind = kinds[i] ?? "year";
    if (kind === "image") {
      const titles = new Set([movie.title]);
      for (const m of shuffle(usable, rnd)) {
        if (titles.size >= 4) break;
        titles.add(m.title);
      }
      return { kind, movie, answer: movie.title, options: shuffle([...titles], rnd) };
    }
    const y = Number(yearOf(movie));
    const years = new Set([y]);
    const thisYear = new Date().getFullYear();
    while (years.size < 4) {
      const off = (1 + Math.floor(rnd() * 8)) * (rnd() < 0.5 ? -1 : 1);
      const cand = y + off;
      if (cand <= thisYear && cand > 1900) years.add(cand);
    }
    return { kind, movie, answer: String(y), options: shuffle([...years].map(String), rnd) };
  });
}

/** Wordle-style shareable result squares: 🟩 full points, 🟨 partial, ⬛ wrong */
export function resultGrid(results: { points: number; max: number }[]) {
  return results.map((r) => (r.points === r.max ? "🟩" : r.points > 0 ? "🟨" : "⬛")).join("");
}

export const DAILY_KINDS: RoundKind[] = ["image", "year", "image", "year", "image"];
export const dailyMax = DAILY_KINDS.reduce((s, k) => s + MAX_POINTS[k], 0);
