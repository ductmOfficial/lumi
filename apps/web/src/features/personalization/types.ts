import type { MovieDetail, MovieSummary } from "@/lib/tmdb";

/** A trimmed-down title with just enough to render a card — stored in localStorage. */
export interface MovieLite {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  /** 'tv' for series; absent = movie */
  media_type?: "movie" | "tv";
}

export type SignalType = "onboard" | "watchlist" | "like" | "trailer" | "view" | "dislike";

export interface SignalEvent {
  type: SignalType;
  movieId?: number;
  mediaType?: "movie" | "tv";
  genreIds: number[];
  at: number;
}

export type Reaction = "like" | "dislike";

export function toLite(m: MovieSummary | MovieDetail | MovieLite): MovieLite {
  const genre_ids = "genre_ids" in m ? m.genre_ids : m.genres.map((g) => g.id);
  return {
    id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    release_date: m.release_date,
    vote_average: m.vote_average,
    genre_ids,
    ...(m.media_type === "tv" ? { media_type: "tv" as const } : {}),
  };
}
