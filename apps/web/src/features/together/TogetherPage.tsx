import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { Copy, Heart, PartyPopper, Play, RotateCcw, Star, Users, X } from "lucide-react";
import clsx from "clsx";
import { PageMeta } from "@/components/PageMeta";
import { Poster } from "@/components/Poster";
import { Segmented } from "@/components/Segmented";
import {
  tmdbFetch,
  tmdbImage,
  type MediaType,
  type MovieSummary,
  type Paginated,
} from "@/lib/tmdb";
import { movieHref } from "@/lib/slug";
import { formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { useTmdbLocale } from "@/stores/preferences";
import { toast } from "@/stores/toast";
import { useGenres } from "@/features/discover/api/queries";
import { liteQuery } from "@/features/library/api";
import type { MovieLite } from "@/features/personalization/types";
import { cleanName, decodeVotes, encodeVotes, tally, upsertVote, type Vote } from "./session";
import { copyText } from "@/lib/clipboard";

const DECK_SIZE = 15;
const NAME_KEY = "lumi:together-name";

function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** /together — pick a title for the whole group with no server: everything lives in the link */
export function TogetherPage() {
  const t = useT();
  const [params] = useSearchParams();
  const media: MediaType = params.get("m") === "tv" ? "tv" : "movie";
  const ids = useMemo(
    () =>
      (params.get("d") ?? "")
        .split(".")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 30),
    [params],
  );
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-8">
      <PageMeta title={t("tg.title")} />
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users size={24} className="text-accent" /> {t("tg.title")}
        </h1>
        <p className="text-sm text-muted">{t("tg.subtitle")}</p>
      </header>
      {ids.length ? <Session media={media} ids={ids} /> : <Setup />}
    </div>
  );
}

function Setup() {
  const t = useT();
  const { language } = useTmdbLocale();
  const [, setParams] = useSearchParams();
  const [media, setMedia] = useState<MediaType>("movie");
  const [genres, setGenres] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useGenres(media);

  const create = async () => {
    setBusy(true);
    try {
      const page = 1 + Math.floor(Math.random() * 4);
      const res = await tmdbFetch<Paginated<MovieSummary & { name?: string }>>(
        `/discover/${media}`,
        {
          language,
          page,
          sort_by: "popularity.desc",
          "vote_count.gte": media === "tv" ? 150 : 400,
          with_genres: genres.join(",") || undefined,
          include_adult: false,
        },
      );
      const deck = res.results
        .filter((m) => m.poster_path)
        .sort(() => Math.random() - 0.5)
        .slice(0, DECK_SIZE)
        .map((m) => m.id);
      if (deck.length) setParams({ m: media, d: deck.join(".") });
      else toast(t("tg.noResults"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
      <ol className="space-y-1.5 text-sm text-muted">
        <li>1. {t("tg.step1")}</li>
        <li>2. {t("tg.step2")}</li>
        <li>3. {t("tg.step3")}</li>
      </ol>
      <Segmented<MediaType>
        ariaLabel={t("tg.title")}
        value={media}
        onChange={(m) => {
          setMedia(m);
          setGenres([]);
        }}
        options={[
          { value: "movie", label: t("search.movies") },
          { value: "tv", label: t("search.tv") },
        ]}
      />
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("tg.genres")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(list.data ?? []).map((g) => {
            const on = genres.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setGenres((cur) =>
                    on ? cur.filter((x) => x !== g.id) : [...cur, g.id].slice(-2),
                  );
                }}
                className={clsx(
                  "rounded-full border px-3 py-1 text-sm transition",
                  on ? "border-accent bg-accent text-accent-fg" : "border-border hover:border-fg",
                )}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg disabled:opacity-60"
      >
        <Play size={16} /> {busy ? t("common.loading") : t("tg.create")}
      </button>
    </div>
  );
}

function Session({ media, ids }: { media: MediaType; ids: number[] }) {
  const t = useT();
  const { language } = useTmdbLocale();
  const [params, setParams] = useSearchParams();
  const votes = useMemo(() => decodeVotes(params.get("r"), ids.length), [params, ids.length]);
  const results = useQueries({ queries: ids.map((id) => liteQuery(media, id, language)) });
  const [name, setName] = useState(loadName);
  const [phase, setPhase] = useState<"intro" | "swipe" | "done">("intro");
  const [likes, setLikes] = useState<boolean[]>([]);
  const i = likes.length;
  const item = results[i]?.data;

  const vote = (like: boolean) => {
    const next = [...likes, like];
    setLikes(next);
    if (next.length === ids.length) {
      const all = upsertVote(votes, { name: cleanName(name) || t("tg.you"), likes: next });
      const p = new URLSearchParams(params);
      p.set("r", encodeVotes(all));
      setParams(p, { replace: true });
      setPhase("done");
    }
  };

  // ← / → keys while swiping
  useEffect(() => {
    if (phase !== "swipe") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") vote(false);
      if (e.key === "ArrowRight") vote(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  if (phase === "intro") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm">{t("tg.intro", { n: ids.length })}</p>
        {votes.length > 0 && (
          <p className="text-sm text-muted">
            {t("tg.already")}: <b className="text-fg">{votes.map((v) => v.name).join(", ")}</b>
          </p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              localStorage.setItem(NAME_KEY, cleanName(name));
            } catch {
              // ignore
            }
            setLikes([]);
            setPhase("swipe");
          }}
        >
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder={t("tg.namePlaceholder")}
            aria-label={t("tg.name")}
            maxLength={20}
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!cleanName(name)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40"
          >
            {t("tg.start")}
          </button>
        </form>
        {votes.length > 0 && <Results votes={votes} results={results.map((r) => r.data)} />}
      </div>
    );
  }

  if (phase === "swipe") {
    return (
      <div className="space-y-4">
        <div className="flex gap-1">
          {ids.map((id, k) => (
            <span
              key={id}
              className={clsx(
                "h-1.5 flex-1 rounded-full",
                k < i
                  ? likes[k]
                    ? "bg-success"
                    : "bg-muted/40"
                  : k === i
                    ? "bg-accent"
                    : "bg-surface-2",
              )}
            />
          ))}
        </div>
        {item ? (
          <article className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="relative aspect-[4/5] max-h-[60dvh] w-full bg-black sm:aspect-video">
              <img
                src={tmdbImage(
                  item.backdrop_path ?? item.poster_path,
                  item.backdrop_path ? "w780" : "w500",
                )}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                <h2 className="text-2xl font-black leading-tight">{item.title}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-white/80">
                  {formatYear(item.release_date)}
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} className="fill-warning text-warning" />{" "}
                    {item.vote_average.toFixed(1)}
                  </span>
                </p>
                {item.overview && (
                  <p className="mt-2 line-clamp-3 text-sm text-white/85">{item.overview}</p>
                )}
              </div>
            </div>
          </article>
        ) : (
          <div className="aspect-[4/5] max-h-[60dvh] animate-pulse rounded-3xl bg-surface-2 sm:aspect-video" />
        )}
        <div className="flex justify-center gap-6">
          <button
            type="button"
            onClick={() => {
              vote(false);
            }}
            disabled={!item}
            aria-label={t("tg.skip")}
            className="grid size-16 place-items-center rounded-full border-2 border-border bg-surface text-muted transition hover:border-danger hover:text-danger disabled:opacity-40"
          >
            <X size={28} />
          </button>
          <button
            type="button"
            onClick={() => {
              vote(true);
            }}
            disabled={!item}
            aria-label={t("tg.like")}
            className="grid size-16 place-items-center rounded-full bg-success text-white shadow-lg transition hover:scale-105 disabled:opacity-40"
          >
            <Heart size={28} className="fill-current" />
          </button>
        </div>
        <p className="text-center text-xs text-muted">
          {t("tg.keys", { i: i + 1, n: ids.length })}
        </p>
      </div>
    );
  }

  const link = window.location.href;
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-accent/40 bg-accent/10 p-5">
        <p className="flex items-center gap-2 font-bold">
          <PartyPopper size={20} className="text-accent" /> {t("tg.doneTitle")}
        </p>
        <p className="text-sm text-muted">{t("tg.doneHint")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              if ("share" in navigator) {
                try {
                  await navigator.share({ title: t("tg.title"), url: link });
                  return;
                } catch {
                  // cancelled → copy instead
                }
              }
              await copyText(link);
              toast(t("tg.copied"));
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            <Copy size={16} /> {t("tg.sendLink")}
          </button>
          <button
            type="button"
            onClick={() => {
              setLikes([]);
              setPhase("swipe");
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-border"
          >
            <RotateCcw size={16} /> {t("tg.redo")}
          </button>
          <Link
            to="/together"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:text-fg"
          >
            {t("tg.newSession")}
          </Link>
        </div>
      </div>
      <Results votes={votes} results={results.map((r) => r.data)} />
    </div>
  );
}

function Results({ votes, results }: { votes: Vote[]; results: (MovieLite | undefined)[] }) {
  const t = useT();
  const ranking = tally(votes, results.length);
  if (!ranking.length) return <p className="text-sm text-muted">{t("tg.noLikes")}</p>;
  return (
    <div className="space-y-2">
      <h2 className="font-bold">{t("tg.results", { n: votes.length })}</h2>
      <ol className="space-y-2">
        {ranking.slice(0, 8).map((r, k) => {
          const m = results[r.index];
          if (!m) return null;
          return (
            <li
              key={r.index}
              className={clsx(
                "flex items-center gap-3 rounded-xl border p-2 pr-3",
                r.perfect ? "border-success bg-success/10" : "border-border bg-surface",
              )}
            >
              <span className="w-5 text-center text-sm font-bold text-muted">{k + 1}</span>
              <Link to={movieHref(m)} className="shrink-0">
                <Poster
                  path={m.poster_path}
                  alt={m.title}
                  sizes="48px"
                  className="w-11 rounded-md"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={movieHref(m)} className="line-clamp-1 font-semibold hover:underline">
                  {m.title}
                </Link>
                <p className="truncate text-xs text-muted">{r.fans.join(", ")}</p>
              </div>
              {r.perfect ? (
                <span className="shrink-0 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">
                  {t("tg.match")}
                </span>
              ) : (
                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {r.fans.length}/{votes.length}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
