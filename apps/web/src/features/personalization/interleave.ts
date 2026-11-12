/** Interleaves 2 lists (a0, b0, a1, b1, …) — the remainder is appended. */
export function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    out.push(...a.slice(i, i + 1), ...b.slice(i, i + 1));
  }
  return out;
}

/** YYYY-MM-DD date `days` away from `from` (negative = past), in local time. */
export function isoDayOffset(from: Date, days: number): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
