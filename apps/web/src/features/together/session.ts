/** A "watch together" session lives entirely in the URL: the deck (d) + each person's results (r) */

export interface Vote {
  name: string;
  likes: boolean[];
}

export const cleanName = (s: string) =>
  s.replace(/[~,]/g, " ").replace(/\s+/g, " ").trim().slice(0, 20);

/** [true,false,true] → bit 0 = first title → base36 */
export function encodeLikes(likes: boolean[]) {
  let n = 0n;
  likes.forEach((l, i) => {
    if (l) n |= 1n << BigInt(i);
  });
  return n.toString(36);
}

export function decodeLikes(raw: string, count: number) {
  let n = 0n;
  for (const ch of raw.toLowerCase()) {
    const d = parseInt(ch, 36);
    if (Number.isNaN(d)) return Array.from({ length: count }, () => false);
    n = n * 36n + BigInt(d);
  }
  return Array.from({ length: count }, (_, i) => ((n >> BigInt(i)) & 1n) === 1n);
}

export function decodeVotes(raw: string | null, count: number): Vote[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const [name, bits] = part.split("~");
      const n = cleanName(name ?? "");
      return n && bits ? { name: n, likes: decodeLikes(bits, count) } : null;
    })
    .filter((v): v is Vote => !!v)
    .slice(0, 12);
}

/** add / replace one person's votes (a duplicate name replaces) */
export function encodeVotes(votes: Vote[]) {
  return votes.map((v) => `${cleanName(v.name)}~${encodeLikes(v.likes)}`).join(",");
}

export function upsertVote(votes: Vote[], vote: Vote) {
  return [...votes.filter((v) => v.name.toLowerCase() !== vote.name.toLowerCase()), vote];
}

/** Ranking: most liked first; perfect = the whole group liked it */
export function tally(votes: Vote[], count: number) {
  return Array.from({ length: count }, (_, i) => {
    const fans = votes.filter((v) => v.likes[i]).map((v) => v.name);
    return { index: i, fans, perfect: votes.length > 0 && fans.length === votes.length };
  })
    .filter((x) => x.fans.length > 0)
    .sort((a, b) => b.fans.length - a.fans.length || a.index - b.index);
}
