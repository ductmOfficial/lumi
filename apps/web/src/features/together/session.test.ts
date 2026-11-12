import { describe, expect, it } from "vitest";
import { decodeLikes, decodeVotes, encodeLikes, encodeVotes, tally, upsertVote } from "./session";

describe("watch together session", () => {
  it("round-trips encoded likes", () => {
    const likes = [
      true,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ];
    expect(decodeLikes(encodeLikes(likes), likes.length)).toEqual(likes);
  });
  it("votes in the URL: adds people, replaces duplicate names, sanitizes dirty names", () => {
    let votes = decodeVotes("An~5,Zoë~3", 3);
    expect(votes.map((v) => v.name)).toEqual(["An", "Zoë"]);
    votes = upsertVote(votes, { name: "an", likes: [false, false, true] });
    expect(votes).toHaveLength(2);
    expect(decodeVotes(encodeVotes([{ name: "A,~B", likes: [true] }]), 1)[0]?.name).toBe("A B");
  });
  it("ranks titles and detects whole-group likes", () => {
    const votes = [
      { name: "An", likes: [true, true, false] },
      { name: "Zoë", likes: [false, true, true] },
    ];
    const r = tally(votes, 3);
    expect(r[0]).toMatchObject({ index: 1, perfect: true });
    expect(r.map((x) => x.index)).toEqual([1, 0, 2]);
  });
});
