import { beforeEach, describe, expect, it } from "vitest";
import { usePersonalization } from "./store";

const movie = (id: number) => ({
  id,
  title: `M${id}`,
  poster_path: null,
  backdrop_path: null,
  release_date: "2020-01-01",
  vote_average: 7,
  genre_ids: [18],
});

describe("recordTrailer", () => {
  beforeEach(() => {
    usePersonalization.getState().resetAll();
  });

  it("records only a signal by default, without adding to history", () => {
    usePersonalization.getState().recordTrailer(movie(1));
    const s = usePersonalization.getState();
    expect(s.events[0]).toMatchObject({ type: "trailer", movieId: 1 });
    expect(s.history).toHaveLength(0);
  });

  it('addToHistory: moves to the top of "Recently viewed" with the trailer label', () => {
    const { recordView, recordTrailer } = usePersonalization.getState();
    recordView(movie(2));
    recordTrailer(movie(1), { addToHistory: true });
    const h = usePersonalization.getState().history;
    expect(h.map((e) => e.movie.id)).toEqual([1, 2]);
    expect(h[0]?.via).toBe("trailer");
  });

  it('an item whose detail page was opened keeps the "viewed" label after a trailer', () => {
    const { recordView, recordTrailer } = usePersonalization.getState();
    recordView(movie(1));
    recordView(movie(2));
    recordTrailer(movie(1), { addToHistory: true });
    const h = usePersonalization.getState().history;
    expect(h.map((e) => e.movie.id)).toEqual([1, 2]);
    expect(h[0]?.via).toBeUndefined();
  });
});
