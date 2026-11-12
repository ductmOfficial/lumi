import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Check,
  Copy,
  Flame,
  ImageIcon,
  Lightbulb,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import clsx from "clsx";
import { PageMeta } from "@/components/PageMeta";
import { tmdbFetch, tmdbImage, type MovieSummary, type Paginated } from "@/lib/tmdb";
import { movieHref } from "@/lib/slug";
import { useT } from "@/i18n/useT";
import { useTmdbLocale } from "@/stores/preferences";
import { toast } from "@/stores/toast";
import { liveStreak, useLibrary } from "@/features/library/store";
import {
  buildRounds,
  DAILY_KINDS,
  dailyMax,
  hashString,
  MAX_POINTS,
  resultGrid,
  seededRandom,
  type Round,
  type RoundKind,
} from "./game";
import { copyText } from "@/lib/clipboard";

/** Game pool: popular titles with enough images — cached for 1 day */
function usePool() {
  const { language } = useTmdbLocale();
  return useQuery({
    queryKey: ["game-pool", language],
    queryFn: async ({ signal }) => {
      const pages = await Promise.all(
        [
          ["/movie/top_rated", 1],
          ["/movie/top_rated", 2],
          ["/movie/top_rated", 3],
          ["/movie/popular", 1],
          ["/movie/popular", 2],
        ].map(([path, page]) =>
          tmdbFetch<Paginated<MovieSummary & { vote_count?: number }>>(
            path as string,
            { language, page },
            signal,
          ),
        ),
      );
      const seen = new Set<number>();
      return pages
        .flatMap((p) => p.results)
        .filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return Boolean(m.backdrop_path) && m.vote_count >= 800;
        })
        .sort((a, b) => a.id - b.id);
    },
    staleTime: 24 * 3600e3,
  });
}

type Mode = { type: "daily" } | { type: "free"; kind: RoundKind };
const FREE_ROUNDS = 8;
const BLUR = [26, 14, 6];

export function PlayPage() {
  const t = useT();
  const pool = usePool();
  const game = useLibrary((s) => s.game);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<Mode | null>(null);
  const [seed, setSeed] = useState(() => Date.now());
  const playedToday = game.daily[today];
  const streak = liveStreak(game, today);

  const rounds = useMemo(() => {
    if (!mode || !pool.data) return [];
    if (mode.type === "daily")
      return buildRounds(pool.data, DAILY_KINDS, seededRandom(hashString(today)));
    return buildRounds(
      pool.data,
      Array.from({ length: FREE_ROUNDS }, () => mode.kind),
      seededRandom(seed),
    );
  }, [mode, pool.data, today, seed]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
      <PageMeta title={t("game.title")} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("game.title")}</h1>
          <p className="text-sm text-muted">{t("game.subtitle")}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 font-semibold text-warning">
            <Flame size={16} /> {t("game.streak", { n: streak })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 font-semibold">
            <Trophy size={16} className="text-accent" /> {t("game.best", { n: game.bestFree })}
          </span>
        </div>
      </header>

      {!mode ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ModeCard
            icon={<CalendarCheck size={22} />}
            title={t("game.daily")}
            hint={
              playedToday !== undefined
                ? t("game.dailyDone", { n: playedToday, max: dailyMax })
                : t("game.dailyHint")
            }
            disabled={playedToday !== undefined || !pool.data}
            onClick={() => {
              setMode({ type: "daily" });
            }}
            highlight
          />
          <ModeCard
            icon={<ImageIcon size={22} />}
            title={t("game.image")}
            hint={t("game.imageHint")}
            disabled={!pool.data}
            onClick={() => {
              setSeed(Date.now());
              setMode({ type: "free", kind: "image" });
            }}
          />
          <ModeCard
            icon={<CalendarCheck size={22} />}
            title={t("game.year")}
            hint={t("game.yearHint")}
            disabled={!pool.data}
            onClick={() => {
              setSeed(Date.now());
              setMode({ type: "free", kind: "year" });
            }}
          />
        </div>
      ) : rounds.length ? (
        <Game
          key={`${seed}-${mode.type}`}
          rounds={rounds}
          daily={mode.type === "daily"}
          today={today}
          onExit={() => {
            setMode(null);
          }}
          onReplay={() => {
            setSeed(Date.now());
          }}
        />
      ) : (
        <div className="h-80 animate-pulse rounded-2xl bg-surface-2" />
      )}
    </div>
  );
}

function ModeCard({
  icon,
  title,
  hint,
  onClick,
  disabled,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition disabled:opacity-60",
        highlight
          ? "border-accent bg-accent/10 hover:bg-accent/15"
          : "border-border bg-surface hover:border-fg",
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
        {icon}
      </span>
      <span className="font-bold">{title}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}

function Game({
  rounds,
  daily,
  today,
  onExit,
  onReplay,
}: {
  rounds: Round[];
  daily: boolean;
  today: string;
  onExit: () => void;
  onReplay: () => void;
}) {
  const t = useT();
  const recordDaily = useLibrary((s) => s.recordDaily);
  const recordFree = useLibrary((s) => s.recordFree);
  const [i, setI] = useState(0);
  const [hints, setHints] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<{ points: number; max: number }[]>([]);
  const done = results.length === rounds.length;
  const round = rounds[Math.min(i, rounds.length - 1)];
  if (!round) return null;
  const max = MAX_POINTS[round.kind];
  const total = results.reduce((s, r) => s + r.points, 0);
  const totalMax = rounds.reduce((s, r) => s + MAX_POINTS[r.kind], 0);

  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const points = opt === round.answer ? Math.max(1, max - hints) : 0;
    const next = [...results, { points, max }];
    setResults(next);
    if (next.length === rounds.length) {
      const score = next.reduce((s, r) => s + r.points, 0);
      if (daily) recordDaily(today, score);
      else recordFree(score);
    }
  };
  const nextRound = () => {
    setI((n) => n + 1);
    setHints(0);
    setPicked(null);
  };

  if (done && !picked) {
    const grid = resultGrid(results);
    const share = `Lumi ${daily ? `#${today}` : ""} ${total}/${totalMax}\n${grid}\n${window.location.origin}/play`;
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center">
        <Trophy size={40} className="mx-auto text-warning" />
        <p className="text-3xl font-black">
          {total}/{totalMax}
        </p>
        <p className="text-2xl tracking-widest">{grid}</p>
        <p className="text-sm text-muted">
          {t(
            total >= totalMax * 0.8
              ? "game.great"
              : total >= totalMax * 0.5
                ? "game.good"
                : "game.tryAgain",
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await copyText(share);
              toast(t("game.copied"));
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            <Copy size={16} /> {t("game.share")}
          </button>
          {!daily && (
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-border"
            >
              <RotateCcw size={16} /> {t("game.replay")}
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:text-fg"
          >
            {t("game.menu")}
          </button>
        </div>
      </div>
    );
  }

  const correct = picked === round.answer;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {t("game.round", { i: Math.min(i + 1, rounds.length), n: rounds.length })} ·{" "}
          {t(round.kind === "image" ? "game.qImage" : "game.qYear")}
        </span>
        <span className="tabular-nums text-muted">{t("game.score", { n: total })}</span>
      </div>
      <div className="flex gap-1">
        {rounds.map((r, k) => (
          <span
            key={r.movie.id}
            className={clsx(
              "h-1.5 flex-1 rounded-full",
              k < results.length
                ? results[k]?.points
                  ? "bg-success"
                  : "bg-danger"
                : k === i
                  ? "bg-accent"
                  : "bg-surface-2",
            )}
          />
        ))}
      </div>

      {round.kind === "image" ? (
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
          <img
            src={tmdbImage(round.movie.backdrop_path, "w780")}
            alt=""
            draggable={false}
            className="h-full w-full scale-110 object-cover transition-[filter] duration-500"
            style={{
              filter: picked ? "none" : `blur(${BLUR[Math.min(hints, BLUR.length - 1)]}px)`,
            }}
          />
          {!picked && hints < BLUR.length - 1 && (
            <button
              type="button"
              onClick={() => {
                setHints((h) => h + 1);
              }}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/75"
            >
              <Lightbulb size={14} /> {t("game.hint", { n: max - hints - 1 })}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
          <img
            src={tmdbImage(round.movie.poster_path, "w342")}
            alt=""
            className="aspect-[2/3] w-28 shrink-0 rounded-lg object-cover sm:w-36"
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{t("game.qYear")}</p>
            <p className="text-xl font-black leading-tight sm:text-2xl">{round.movie.title}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {round.options.map((opt) => {
          const isAnswer = opt === round.answer;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                answer(opt);
              }}
              disabled={!!picked}
              className={clsx(
                "min-h-12 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                !picked && "border-border bg-surface hover:border-accent",
                picked && isAnswer && "border-success bg-success/15 text-success",
                picked && opt === picked && !isAnswer && "border-danger bg-danger/15 text-danger",
                picked && !isAnswer && opt !== picked && "border-border opacity-50",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
          <p
            className={clsx(
              "inline-flex items-center gap-1.5 text-sm font-semibold",
              correct ? "text-success" : "text-danger",
            )}
          >
            {correct ? <Check size={16} /> : <X size={16} />}
            {correct ? t("game.correct", { n: results.at(-1)?.points ?? 0 }) : t("game.wrong")}
            <Link
              to={movieHref(round.movie)}
              className="ml-1 font-normal text-muted underline hover:text-fg"
            >
              {round.movie.title}
            </Link>
          </p>
          <button
            type="button"
            onClick={nextRound}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            {results.length === rounds.length ? t("game.seeResult") : t("game.next")}
          </button>
        </div>
      )}
    </div>
  );
}
