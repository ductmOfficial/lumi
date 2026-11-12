import { omitKey } from "@/lib/record";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mediaKey } from "@/lib/slug";
import { toLite, type MovieLite, type Reaction, type SignalEvent, type SignalType } from "./types";

const MAX_HISTORY = 40;
const MAX_EVENTS = 400;

interface Entry {
  movie: MovieLite;
  at: number;
  /** in history because a trailer was played inline (detail page never opened) */
  via?: "trailer";
}

type MediaInput = Parameters<typeof toLite>[0];

interface PersonalizationState {
  /** movies/series whose detail page was opened, newest first */
  history: Entry[];
  watchlist: Entry[];
  /** 👍/👎 feedback, keyed by mediaKey ("movie-123" | "tv-456") because movie & series ids can collide */
  reactions: Record<string, { reaction: Reaction; movie: MovieLite; at: number }>;
  events: SignalEvent[];
  onboarding: { status: "pending" | "done" | "skipped"; genreIds: number[] };
  /** followed topics (slugs in THEMES) → get their own row on Home / Series */
  topics: string[];

  recordView: (movie: MediaInput) => void;
  /** records a trailer signal; addToHistory: add to "Recently viewed" (trailer played outside the detail page) */
  recordTrailer: (movie: MediaInput, opts?: { addToHistory?: boolean }) => void;
  toggleWatchlist: (movie: MediaInput) => boolean;
  setReaction: (movie: MediaInput, reaction: Reaction | null) => void;
  completeOnboarding: (genreIds: number[], movies: MediaInput[]) => void;
  skipOnboarding: () => void;
  restartOnboarding: () => void;
  /** toggles following a topic and returns the new state */
  toggleTopic: (slug: string) => boolean;
  clearHistory: () => void;
  resetAll: () => void;
}

const initial = {
  history: [] as Entry[],
  watchlist: [] as Entry[],
  reactions: {} as PersonalizationState["reactions"],
  events: [] as SignalEvent[],
  onboarding: { status: "pending" as const, genreIds: [] as number[] },
  topics: [] as string[],
};

const same = (a: MovieLite, b: MovieLite) => mediaKey(a) === mediaKey(b);

const pushEvent = (
  events: SignalEvent[],
  type: SignalType,
  movie: MovieLite | null,
  genreIds?: number[],
) =>
  [
    {
      type,
      movieId: movie?.id,
      mediaType: movie?.media_type,
      genreIds: genreIds ?? movie?.genre_ids ?? [],
      at: Date.now(),
    },
    ...events,
  ].slice(0, MAX_EVENTS);

export const usePersonalization = create<PersonalizationState>()(
  persist(
    (set, get) => ({
      ...initial,

      recordView: (m) => {
        const movie = toLite(m);
        set((s) => {
          // avoid duplicate records if this item was viewed within the last 30 minutes
          const last = s.history[0];
          const recentDup = !!last && same(last.movie, movie) && Date.now() - last.at < 30 * 60_000;
          return {
            history: [
              { movie, at: Date.now() },
              ...s.history.filter((e) => !same(e.movie, movie)),
            ].slice(0, MAX_HISTORY),
            events: recentDup ? s.events : pushEvent(s.events, "view", movie),
          };
        });
      },

      recordTrailer: (m, opts) =>
        set((s) => {
          const movie = toLite(m);
          const events = pushEvent(s.events, "trailer", movie);
          if (!opts?.addToHistory) return { events };
          // once the detail page was opened, keep the "viewed" label and just move it to the top
          const existing = s.history.find((e) => same(e.movie, movie));
          const entry: Entry = {
            movie,
            at: Date.now(),
            via: existing && !existing.via ? undefined : "trailer",
          };
          return {
            events,
            history: [entry, ...s.history.filter((e) => !same(e.movie, movie))].slice(
              0,
              MAX_HISTORY,
            ),
          };
        }),

      toggleWatchlist: (m) => {
        const movie = toLite(m);
        const exists = get().watchlist.some((e) => same(e.movie, movie));
        set((s) => ({
          watchlist: exists
            ? s.watchlist.filter((e) => !same(e.movie, movie))
            : [{ movie, at: Date.now() }, ...s.watchlist],
          events: exists
            ? s.events.filter(
                (e) =>
                  !(
                    e.type === "watchlist" &&
                    e.movieId === movie.id &&
                    e.mediaType === movie.media_type
                  ),
              )
            : pushEvent(s.events, "watchlist", movie),
        }));
        return !exists;
      },

      setReaction: (m, reaction) => {
        const movie = toLite(m);
        const key = mediaKey(movie);
        set((s) => {
          // drop this item's previous like/dislike signal
          let events = s.events.filter(
            (e) =>
              !(
                (e.type === "like" || e.type === "dislike") &&
                e.movieId === movie.id &&
                e.mediaType === movie.media_type
              ),
          );
          if (reaction) events = pushEvent(events, reaction, movie);
          const reactions = reaction
            ? { ...s.reactions, [key]: { reaction, movie, at: Date.now() } }
            : omitKey(s.reactions, key);
          return { reactions, events };
        });
      },

      completeOnboarding: (genreIds, movies) =>
        set((s) => {
          let events = s.events;
          if (genreIds.length) events = pushEvent(events, "onboard", null, genreIds);
          const reactions = { ...s.reactions };
          for (const m of movies) {
            const lite = toLite(m);
            events = pushEvent(events, "onboard", lite);
            reactions[mediaKey(lite)] = { reaction: "like", movie: lite, at: Date.now() };
          }
          return { events, reactions, onboarding: { status: "done", genreIds } };
        }),

      skipOnboarding: () => set((s) => ({ onboarding: { ...s.onboarding, status: "skipped" } })),

      restartOnboarding: () => set((s) => ({ onboarding: { ...s.onboarding, status: "pending" } })),

      toggleTopic: (slug) => {
        const on = !get().topics.includes(slug);
        set((s) => ({ topics: on ? [slug, ...s.topics] : s.topics.filter((t) => t !== slug) }));
        return on;
      },

      clearHistory: () =>
        set((s) => ({
          history: [],
          events: s.events.filter((e) => e.type !== "view" && e.type !== "trailer"),
        })),

      resetAll: () => set({ ...initial }),
    }),
    { name: "lumi:personalization" },
  ),
);

// ---- selectors ----
interface Keyed {
  id: number;
  media_type?: "movie" | "tv";
}

export const useIsInWatchlist = (m: Keyed) => {
  const key = mediaKey(m);
  return usePersonalization((s) => s.watchlist.some((e) => mediaKey(e.movie) === key));
};
export const useReaction = (m: Keyed) => {
  const key = mediaKey(m);
  return usePersonalization((s) => s.reactions[key]?.reaction ?? null);
};
/** Set of mediaKeys the user gave 👎 */
export const useDislikedKeys = () => {
  const reactions = usePersonalization((s) => s.reactions);
  return dislikedKeysOf(reactions);
};
const cache = new WeakMap<object, Set<string>>();
function dislikedKeysOf(reactions: PersonalizationState["reactions"]) {
  let set = cache.get(reactions);
  if (!set) {
    set = new Set(
      Object.values(reactions)
        .filter((r) => r.reaction === "dislike")
        .map((r) => mediaKey(r.movie)),
    );
    cache.set(reactions, set);
  }
  return set;
}

/** Is this topic followed? */
export const useIsFollowingTopic = (slug: string) =>
  usePersonalization((s) => s.topics.includes(slug));
