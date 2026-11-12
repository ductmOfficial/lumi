import { omitKey } from "@/lib/record";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mediaKey } from "@/lib/slug";
import { toLite, type MovieLite } from "@/features/personalization/types";

/**
 * Personal library (browser storage only): watch diary + ratings, per-episode series progress,
 * custom lists, release reminders, mini-game stats.
 */

type MediaInput = Parameters<typeof toLite>[0];

export interface WatchedEntry {
  movie: MovieLite;
  at: number;
  /** personal rating 1–10 */
  rating?: number;
}

export interface ShowProgress {
  show: MovieLite;
  /** watched episodes, keyed "season-episode" (e.g. "2-5") */
  seen: string[];
  at: number;
}

export interface UserList {
  id: string;
  name: string;
  items: MovieLite[];
  createdAt: number;
  updatedAt: number;
}

export interface Reminder {
  movie: MovieLite;
  /** release date YYYY-MM-DD */
  date: string;
  notified?: boolean;
}

export interface GameStats {
  /** latest date (YYYY-MM-DD) the daily challenge was completed */
  lastDay: string | null;
  streak: number;
  bestStreak: number;
  /** daily challenge scores by date (keeps the last 60 days) */
  daily: Record<string, number>;
  bestFree: number;
  played: number;
}

export const episodeKey = (season: number, episode: number) => `${season}-${episode}`;

interface LibraryState {
  watched: Record<string, WatchedEntry>;
  progress: Record<string, ShowProgress>;
  lists: UserList[];
  reminders: Record<string, Reminder>;
  game: GameStats;

  /** marks / unmarks as watched; returns the new state */
  toggleWatched: (m: MediaInput) => boolean;
  /** rates (marks as watched too); null = clear the rating */
  setRating: (m: MediaInput, rating: number | null) => void;

  setEpisodes: (show: MediaInput, keys: string[], seen: boolean) => void;

  createList: (name: string, first?: MediaInput) => string;
  importList: (name: string, items: MovieLite[]) => string;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  /** adds / removes an item from a list; returns true if it was added */
  toggleInList: (id: string, m: MediaInput) => boolean;
  moveInList: (id: string, index: number, delta: -1 | 1) => void;

  toggleReminder: (m: MediaInput, date: string) => boolean;
  markNotified: (key: string) => void;

  recordDaily: (day: string, score: number) => void;
  recordFree: (score: number) => void;

  reset: () => void;
}

const initialGame: GameStats = {
  lastDay: null,
  streak: 0,
  bestStreak: 0,
  daily: {},
  bestFree: 0,
  played: 0,
};
const initial = {
  watched: {} as Record<string, WatchedEntry>,
  progress: {} as Record<string, ShowProgress>,
  lists: [] as UserList[],
  reminders: {} as Record<string, Reminder>,
  game: initialGame,
};

const newId = () => Math.random().toString(36).slice(2, 9);

/** the previous day (YYYY-MM-DD, in UTC to stay stable across time zones) */
export function previousDay(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      ...initial,

      toggleWatched: (m) => {
        const movie = toLite(m);
        const key = mediaKey(movie);
        const on = !get().watched[key];
        set((s) => {
          const watched = on
            ? { ...s.watched, [key]: { movie, at: Date.now() } }
            : omitKey(s.watched, key);
          return { watched };
        });
        return on;
      },

      setRating: (m, rating) => {
        const movie = toLite(m);
        const key = mediaKey(movie);
        set((s) => {
          const prev = s.watched[key];
          const entry: WatchedEntry = {
            movie,
            at: prev?.at ?? Date.now(),
            ...(rating ? { rating } : {}),
          };
          return { watched: { ...s.watched, [key]: entry } };
        });
      },

      setEpisodes: (m, keys, seen) => {
        const show = toLite(m);
        const id = String(show.id);
        set((s) => {
          const prev = new Set(s.progress[id]?.seen ?? []);
          keys.forEach((k) => (seen ? prev.add(k) : prev.delete(k)));
          const progress = prev.size
            ? { ...s.progress, [id]: { show, seen: [...prev], at: Date.now() } }
            : omitKey(s.progress, id);
          return { progress };
        });
      },

      createList: (name, first) => {
        const id = newId();
        const now = Date.now();
        set((s) => ({
          lists: [
            {
              id,
              name: name.trim() || "…",
              items: first ? [toLite(first)] : [],
              createdAt: now,
              updatedAt: now,
            },
            ...s.lists,
          ],
        }));
        return id;
      },

      importList: (name, items) => {
        const id = newId();
        const now = Date.now();
        set((s) => ({ lists: [{ id, name, items, createdAt: now, updatedAt: now }, ...s.lists] }));
        return id;
      },

      renameList: (id, name) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === id ? { ...l, name: name.trim() || l.name, updatedAt: Date.now() } : l,
          ),
        })),

      deleteList: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== id) })),

      toggleInList: (id, m) => {
        const movie = toLite(m);
        const key = mediaKey(movie);
        const list = get().lists.find((l) => l.id === id);
        const has = !!list?.items.some((i) => mediaKey(i) === key);
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id !== id
              ? l
              : {
                  ...l,
                  updatedAt: Date.now(),
                  items: has ? l.items.filter((i) => mediaKey(i) !== key) : [...l.items, movie],
                },
          ),
        }));
        return !has;
      },

      moveInList: (id, index, delta) =>
        set((s) => ({
          lists: s.lists.map((l) => {
            if (l.id !== id) return l;
            const to = index + delta;
            if (to < 0 || to >= l.items.length) return l;
            const items = [...l.items];
            const a = items[index];
            const b = items[to];
            if (!a || !b) return l;
            items[index] = b;
            items[to] = a;
            return { ...l, items, updatedAt: Date.now() };
          }),
        })),

      toggleReminder: (m, date) => {
        const movie = toLite(m);
        const key = mediaKey(movie);
        const on = !get().reminders[key];
        set((s) => {
          const reminders = on
            ? { ...s.reminders, [key]: { movie, date } }
            : omitKey(s.reminders, key);
          return { reminders };
        });
        return on;
      },

      markNotified: (key) =>
        set((s) =>
          s.reminders[key]
            ? { reminders: { ...s.reminders, [key]: { ...s.reminders[key], notified: true } } }
            : s,
        ),

      recordDaily: (day, score) =>
        set((s) => {
          const g = s.game;
          if (g.daily[day] !== undefined) return s;
          const streak = g.lastDay === previousDay(day) ? g.streak + 1 : 1;
          const daily = Object.fromEntries(
            Object.entries({ ...g.daily, [day]: score })
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 60),
          );
          return {
            game: {
              ...g,
              lastDay: day,
              streak,
              bestStreak: Math.max(g.bestStreak, streak),
              daily,
              played: g.played + 1,
            },
          };
        }),

      recordFree: (score) =>
        set((s) => ({
          game: {
            ...s.game,
            bestFree: Math.max(s.game.bestFree, score),
            played: s.game.played + 1,
          },
        })),

      reset: () => set({ ...initial }),
    }),
    { name: "lumi:library" },
  ),
);

// ---- selectors ----
interface Keyed {
  id: number;
  media_type?: "movie" | "tv";
}

export const useWatched = (m: Keyed) => {
  const key = mediaKey(m);
  return useLibrary((s) => s.watched[key]);
};
export const useHasReminder = (m: Keyed) => {
  const key = mediaKey(m);
  return useLibrary((s) => !!s.reminders[key]);
};

/** a streak is still valid if the user played today or yesterday */
export function liveStreak(game: GameStats, today: string) {
  if (!game.lastDay) return 0;
  return game.lastDay === today || game.lastDay === previousDay(today) ? game.streak : 0;
}
