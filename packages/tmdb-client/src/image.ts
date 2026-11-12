export type PosterSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";
export type BackdropSize = "w300" | "w780" | "w1280" | "original";
export type ProfileSize = "w45" | "w185" | "h632" | "original";
export type LogoSize = "w45" | "w92" | "w154" | "w185" | "w300" | "w500" | "original";

export function imageUrl(
  base: string,
  path: string | null | undefined,
  size: string,
): string | undefined {
  if (!path) return undefined;
  return `${base}/${size}${path}`;
}

/** srcSet for w{N} images: lets the browser pick a suitable size. */
export function imageSrcSet(
  base: string,
  path: string | null | undefined,
  sizes: readonly `w${number}`[],
): string | undefined {
  if (!path) return undefined;
  return sizes.map((s) => `${base}/${s}${path} ${s.slice(1)}w`).join(", ");
}
