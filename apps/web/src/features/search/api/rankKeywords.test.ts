import { describe, expect, it } from "vitest";
import { rankKeywords } from "./queries";

describe("rankKeywords", () => {
  it("exact → starts with → has a word starting with → contains", () => {
    const list = [
      { id: 1, name: "post-apocalyptic survival" },
      { id: 2, name: "survival horror" },
      { id: 3, name: "survival" },
      { id: 4, name: "desert survival" },
    ];
    expect(rankKeywords(list, "Survival").map((k) => k.id)).toEqual([3, 2, 4, 1]);
  });
});
