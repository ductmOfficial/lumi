import type { MovieLite } from "@/features/personalization/types";

/** Encodes a list into the URL: "m123.t456" (m = movie, t = series) — no server needed */
export function encodeItems(items: Pick<MovieLite, "id" | "media_type">[]) {
  return items.map((m) => `${m.media_type === "tv" ? "t" : "m"}${m.id}`).join(".");
}

export function decodeItems(raw: string | null): { type: "movie" | "tv"; id: number }[] {
  if (!raw) return [];
  return raw
    .split(".")
    .map((tok) => {
      const m = /^([mt])(\d{1,9})$/.exec(tok);
      return m
        ? { type: m[1] === "t" ? ("tv" as const) : ("movie" as const), id: Number(m[2]) }
        : null;
    })
    .filter((x): x is { type: "movie" | "tv"; id: number } => !!x)
    .slice(0, 100);
}

export function shareListUrl(origin: string, name: string, items: MovieLite[]) {
  const q = new URLSearchParams({ n: name, i: encodeItems(items) });
  return `${origin}/lists/shared?${q}`;
}
