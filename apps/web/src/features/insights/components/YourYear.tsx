import { useMemo, useState } from "react";
import {
  Award,
  Bot,
  Clapperboard,
  Download,
  Film,
  Flame,
  Ghost,
  Heart,
  Hourglass,
  ListChecks,
  Palette,
  Popcorn,
  Rocket,
  Share2,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { toast } from "@/stores/toast";
import { useLibrary } from "@/features/library/store";
import { useGenreNames } from "@/features/personalization/hooks";
import { downloadFile } from "@/features/library/ics";
import { computeBadges, computeWrapped, type BadgeId, type Wrapped } from "../badges";

const BADGE_ICON: Record<BadgeId, LucideIcon> = {
  first: Popcorn,
  cinephile: Film,
  marathon: Clapperboard,
  horror: Ghost,
  animation: Palette,
  scifi: Rocket,
  romance: Heart,
  decades: Hourglass,
  binge: Tv,
  critic: Star,
  curator: ListChecks,
  streak: Flame,
};

/** Badges + year-end Wrapped (on-device data) */
export function YourYear() {
  const t = useT();
  const watchedMap = useLibrary((s) => s.watched);
  const progressMap = useLibrary((s) => s.progress);
  const lists = useLibrary((s) => s.lists);
  const game = useLibrary((s) => s.game);
  const [year] = useState(() => new Date().getFullYear());
  const watched = useMemo(() => Object.values(watchedMap), [watchedMap]);
  const progress = useMemo(() => Object.values(progressMap), [progressMap]);
  const badges = useMemo(
    () => computeBadges({ watched, progress, lists, game }),
    [watched, progress, lists, game],
  );
  const wrapped = useMemo(() => computeWrapped(watched, progress, year), [watched, progress, year]);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t("badge.title")}</h2>
          <span className="text-sm text-muted">
            {t("badge.count", { n: earned, total: badges.length })}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {badges.map((b) => {
            const Icon = BADGE_ICON[b.id];
            return (
              <li
                key={b.id}
                title={t(`badge.${b.id}.desc`, { n: b.target })}
                className={clsx(
                  "flex flex-col gap-2 rounded-2xl border p-3",
                  b.earned ? "border-warning/50 bg-warning/10" : "border-border bg-surface",
                )}
              >
                <span
                  className={clsx(
                    "grid size-10 place-items-center rounded-xl",
                    b.earned ? "bg-warning text-black" : "bg-surface-2 text-muted",
                  )}
                >
                  <Icon size={20} />
                </span>
                <span className="text-sm font-bold leading-tight">{t(`badge.${b.id}.name`)}</span>
                <span className="text-xs text-muted">
                  {t(`badge.${b.id}.desc`, { n: b.target })}
                </span>
                <span className="mt-auto flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className={clsx(
                        "block h-full rounded-full",
                        b.earned ? "bg-warning" : "bg-accent",
                      )}
                      style={{ width: `${(b.current / b.target) * 100}%` }}
                    />
                  </span>
                  <span className="text-[11px] tabular-nums text-muted">
                    {b.current}/{b.target}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <WrappedCard w={wrapped} />
    </section>
  );
}

function WrappedCard({ w }: { w: Wrapped }) {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const genreNames = useGenreNames();
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", { month: "long" }).format(
      new Date(2000, m, 1),
    );
  const empty = w.movies + w.series === 0;
  const stats: [string, string][] = [
    [t("wrapped.movies"), String(w.movies)],
    [t("wrapped.series"), String(w.series)],
    [t("wrapped.episodes"), String(w.episodes)],
    [t("wrapped.avg"), w.avgRating ? w.avgRating.toFixed(1) : "–"],
  ];
  const lines: [string, string][] = [
    [
      t("wrapped.topGenres"),
      w.topGenres.map((g) => genreNames.get(g.id) ?? `#${g.id}`).join(", ") || "–",
    ],
    [t("wrapped.topDecade"), w.topDecade ?? "–"],
    [t("wrapped.busiest"), w.busiestMonth !== null ? monthName(w.busiestMonth) : "–"],
    [
      t("wrapped.favorite"),
      w.favorite ? `${w.favorite.movie.title} · ${w.favorite.rating}/10` : "–",
    ],
  ];

  const makeImage = () => drawWrapped(t("wrapped.title", { year: w.year }), stats, lines);
  const download = async () => {
    const blob = await makeImage();
    if (blob) downloadFile(`lumi-year-${w.year}.png`, blob);
  };
  const share = async () => {
    const blob = await makeImage();
    if (!blob) return;
    const file = new File([blob], `lumi-year-${w.year}.png`, { type: "image/png" });
    if ("canShare" in navigator && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t("wrapped.title", { year: w.year }) });
      } catch {
        // cancelled
      }
    } else {
      downloadFile(file.name, blob);
      toast(t("wrapped.downloaded"));
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-700 p-5 text-white shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            <Award size={14} /> Lumi · {w.year}
          </p>
          <h3 className="text-2xl font-black sm:text-3xl">
            {t("wrapped.title", { year: w.year })}
          </h3>
        </div>
        {!empty && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/30"
            >
              <Download size={15} /> {t("wrapped.download")}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-white/90"
            >
              <Share2 size={15} /> {t("wrapped.share")}
            </button>
          </div>
        )}
      </div>
      {empty ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-white/85">
          <Bot size={18} /> {t("wrapped.empty")}
        </p>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <dt className="text-xs text-white/75">{k}</dt>
                <dd className="text-2xl font-black tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {lines.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 text-white/70">{k}:</dt>
                <dd className="min-w-0 truncate font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

/** Draws the 1080×1350 Wrapped card on a canvas → PNG (for social sharing) */
function drawWrapped(
  title: string,
  stats: [string, string][],
  lines: [string, string][],
): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#c026d3");
  g.addColorStop(0.5, "#7c3aed");
  g.addColorStop(1, "#4338ca");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(W - 120, 140, 260, 0, Math.PI * 2);
  ctx.fill();
  const font = (w: number, s: number) => `${w} ${s}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = font(700, 34);
  ctx.fillText("LUMI", 80, 130);
  ctx.fillStyle = "#fff";
  ctx.font = font(900, 84);
  ctx.fillText(title, 80, 230, W - 160);
  stats.forEach(([k, v], i) => {
    const x = 80 + (i % 2) * 470;
    const y = 320 + Math.floor(i / 2) * 230;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.roundRect(x, y, 440, 200, 32);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = font(600, 32);
    ctx.fillText(k, x + 36, y + 64, 370);
    ctx.fillStyle = "#fff";
    ctx.font = font(900, 92);
    ctx.fillText(v, x + 36, y + 165, 370);
  });
  lines.forEach(([k, v], i) => {
    const y = 870 + i * 100;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = font(600, 30);
    ctx.fillText(k, 80, y);
    ctx.fillStyle = "#fff";
    ctx.font = font(800, 40);
    ctx.fillText(v, 80, y + 48, W - 160);
  });
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = font(600, 26);
  ctx.fillText("Lumi · Data: TMDB", 80, H - 60);
  return new Promise((resolve) => {
    c.toBlob(resolve, "image/png");
  });
}
