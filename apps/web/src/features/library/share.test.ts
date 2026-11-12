import { describe, expect, it } from "vitest";
import { decodeItems, encodeItems } from "./share";

describe("list share encoding", () => {
  it("round-trips encoding & decoding", () => {
    const raw = encodeItems([{ id: 12 }, { id: 99, media_type: "tv" }]);
    expect(raw).toBe("m12.t99");
    expect(decodeItems(raw)).toEqual([
      { type: "movie", id: 12 },
      { type: "tv", id: 99 },
    ]);
  });
  it("skips invalid fragments", () => {
    expect(decodeItems("m1.x2.t3..m<script>")).toEqual([
      { type: "movie", id: 1 },
      { type: "tv", id: 3 },
    ]);
  });
});
