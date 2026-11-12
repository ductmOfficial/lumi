import clsx from "clsx";
import { useT } from "@/i18n/useT";
import { tmdbImage } from "@/lib/tmdb";

type Variant = "backdrops" | "posters" | "logos";

interface Props {
  paths: string[];
  total: number;
  onOpen: (i: number) => void;
  variant?: Variant;
}

interface Layout {
  /** grid class */
  grid: string;
  /** class for each cell in order (missing cells use the last one) */
  tiles: string[];
}

/*
 * Facebook-style layout that adapts to the NUMBER and SHAPE of images.
 * Aspect ratios are chosen so posters (2:3) are cropped as little as possible.
 */
const BACKDROP_LAYOUTS: Record<number, Layout> = {
  1: { grid: "grid-cols-1", tiles: ["aspect-video"] },
  // 2 landscape images: stacked
  2: { grid: "grid-cols-1", tiles: ["aspect-[21/9]"] },
  // 1 large on top + 2 below
  3: { grid: "grid-cols-2", tiles: ["col-span-2 aspect-video", "aspect-video"] },
  // 1 large on top + 3 below
  4: { grid: "grid-cols-3", tiles: ["col-span-3 aspect-[2/1]", "aspect-video"] },
  // 2 on top + 3 below
  5: {
    grid: "grid-cols-6",
    tiles: ["col-span-3 aspect-[4/3]", "col-span-3 aspect-[4/3]", "col-span-2 aspect-[4/3]"],
  },
};

const POSTER_LAYOUTS: Record<number, Layout> = {
  1: { grid: "grid-cols-3", tiles: ["col-start-2 aspect-[2/3]"] },
  2: { grid: "grid-cols-2", tiles: ["aspect-[2/3]"] },
  // 1 large poster on the left (2 columns × 2 rows) + 2 posters on the right — a square frame keeps all 3 at exactly 2:3
  3: { grid: "aspect-square grid-cols-3 grid-rows-2", tiles: ["col-span-2 row-span-2", ""] },
  // 2×2 grid, lightly cropped to 3:4
  4: { grid: "grid-cols-2", tiles: ["aspect-[3/4]"] },
  // 2 large on top + 3 below
  5: {
    grid: "grid-cols-6",
    tiles: ["col-span-3 aspect-[3/4]", "col-span-3 aspect-[3/4]", "col-span-2 aspect-[2/3]"],
  },
};

const LOGO_LAYOUTS: Record<number, Layout> = {
  1: { grid: "grid-cols-1", tiles: ["aspect-[3/1]"] },
  2: { grid: "grid-cols-2", tiles: ["aspect-[16/9]"] },
  3: { grid: "grid-cols-3", tiles: ["aspect-[4/3]"] },
  4: { grid: "grid-cols-2", tiles: ["aspect-[2/1]"] },
  5: {
    grid: "grid-cols-6",
    tiles: ["col-span-3 aspect-[2/1]", "col-span-3 aspect-[2/1]", "col-span-2 aspect-[4/3]"],
  },
  6: { grid: "grid-cols-3", tiles: ["aspect-[4/3]"] },
};

const LAYOUTS: Record<Variant, Record<number, Layout>> = {
  backdrops: BACKDROP_LAYOUTS,
  posters: POSTER_LAYOUTS,
  logos: LOGO_LAYOUTS,
};

/** Logos are often transparent & multicolored → alternate dark / light backgrounds so they stand out. */
const LOGO_BG = [
  "bg-[radial-gradient(circle_at_30%_20%,#3f3f46,#09090b)]",
  "bg-[radial-gradient(circle_at_70%_30%,#fafafa,#d4d4d8)]",
  "bg-[radial-gradient(circle_at_50%_0%,#1e3a5f,#0b1220)]",
];

export function PhotoCollage({ paths, total, onOpen, variant = "backdrops" }: Props) {
  const t = useT();
  const table = LAYOUTS[variant];
  const maxKey = Math.max(...Object.keys(table).map(Number));
  const shown = paths.slice(0, maxKey);
  const layout = table[Math.min(shown.length, maxKey)] ?? table[maxKey];
  const extra = total - shown.length;
  if (!layout) return null;

  return (
    <div className={clsx("grid gap-0.5 bg-border", layout.grid)}>
      {shown.map((p, i) => {
        const tile = layout.tiles[Math.min(i, layout.tiles.length - 1)];
        const isLast = i === shown.length - 1;
        const big = i === 0 && shown.length > 2;
        const size =
          variant === "posters"
            ? big
              ? "w500"
              : "w342"
            : variant === "logos"
              ? "w500"
              : big || shown.length <= 2
                ? "w1280"
                : "w780";
        return (
          <button
            type="button"
            key={p}
            onClick={() => {
              onOpen(i);
            }}
            aria-label={`${t("media.viewPhoto")} ${i + 1}`}
            className={clsx(
              "group/tile relative overflow-hidden",
              variant === "logos"
                ? clsx("flex items-center justify-center p-[12%]", LOGO_BG[i % LOGO_BG.length])
                : "bg-surface-2",
              tile,
            )}
          >
            <img
              src={tmdbImage(p, size)}
              alt=""
              loading="lazy"
              className={clsx(
                "transition duration-500 group-hover/tile:scale-105",
                variant === "logos"
                  ? "max-h-full max-w-full object-contain drop-shadow-xl"
                  : "h-full w-full object-cover",
              )}
            />
            {/* light dark overlay on hover */}
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover/tile:bg-black/15" />
            {isLast &&
              extra > 0 &&
              (shown.length > 1 ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white backdrop-blur-[2px]">
                  <span className="text-2xl font-black sm:text-3xl">+{extra}</span>
                </span>
              ) : (
                // a single cell → do not cover the image, use a small corner label
                <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-sm font-bold text-white backdrop-blur">
                  +{extra}
                </span>
              ))}
          </button>
        );
      })}
    </div>
  );
}

interface MixedProps {
  backdrops: string[];
  posters: string[];
  /** total number of images (all types) for the "+N" count */
  total: number;
  onOpen: (path: string) => void;
}

/**
 * "Photo set" post merging several types:
 * - backdrops & ≥2 posters → 1–2 backdrops on top, a strip of 2–4 posters below
 * - only backdrops / only posters → the count-based layout for that type
 */
export function MixedPhotoCollage({ backdrops, posters, total, onOpen }: MixedProps) {
  const t = useT();
  if (backdrops.length === 0 || posters.length < 2) {
    const variant: Variant = backdrops.length ? "backdrops" : "posters";
    const paths = backdrops.length ? backdrops : posters;
    return (
      <PhotoCollage
        variant={variant}
        paths={paths}
        total={total}
        onOpen={(i) => {
          const path = paths[i];
          if (path) onOpen(path);
        }}
      />
    );
  }

  const top = backdrops.slice(0, 2);
  const bottom = posters.slice(0, 4);
  // few posters → crop slightly so it is less tall
  const posterAspect = bottom.length === 2 ? "aspect-[4/5]" : "aspect-[2/3]";
  const extra = total - top.length - bottom.length;
  const cols =
    { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[bottom.length] ?? "grid-cols-4";

  const tile = (p: string, size: string, className: string, last = false) => (
    <button
      type="button"
      key={p}
      onClick={() => {
        onOpen(p);
      }}
      aria-label={`${t("media.viewPhoto")} ${[...top, ...bottom].indexOf(p) + 1}`}
      className={clsx("group/tile relative overflow-hidden bg-surface-2", className)}
    >
      <img
        src={tmdbImage(p, size)}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover/tile:scale-105"
      />
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover/tile:bg-black/15" />
      {last && extra > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-black text-white backdrop-blur-[2px] sm:text-3xl">
          +{extra}
        </span>
      )}
    </button>
  );

  return (
    <div className="grid gap-0.5 bg-border">
      <div className={clsx("grid gap-0.5", top.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {top.map((p) =>
          tile(
            p,
            top.length === 1 ? "w1280" : "w780",
            top.length === 1 ? "aspect-video" : "aspect-[16/10]",
          ),
        )}
      </div>
      <div className={clsx("grid gap-0.5", cols)}>
        {bottom.map((p, i) => tile(p, "w342", posterAspect, i === bottom.length - 1))}
      </div>
    </div>
  );
}
