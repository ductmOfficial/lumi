/** Bright background palette like Facebook's "colored background posts" — white text, works in both light & dark themes. */
export const HIGHLIGHT_TONES = {
  sunset: "from-orange-500 via-rose-500 to-fuchsia-600",
  ocean: "from-sky-500 via-blue-600 to-indigo-700",
  forest: "from-emerald-500 via-teal-600 to-cyan-700",
  violet: "from-violet-500 via-purple-600 to-indigo-800",
  gold: "from-amber-400 via-orange-500 to-red-600",
  berry: "from-pink-500 via-rose-600 to-red-700",
  night: "from-slate-600 via-slate-800 to-zinc-900",
} as const;
export type HighlightTone = keyof typeof HIGHLIGHT_TONES;

const TONE_KEYS = Object.keys(HIGHLIGHT_TONES) as HighlightTone[];
/** Picks a stable color by id (same title → same color). */
export const toneFor = (
  seed: number | string,
  exclude: HighlightTone[] = ["night"],
): HighlightTone => {
  const keys = TONE_KEYS.filter((k) => !exclude.includes(k));
  const n =
    typeof seed === "number" ? seed : Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0);
  return keys[Math.abs(n) % keys.length] ?? "sunset";
};
