import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Search, Users, X } from "lucide-react";
import clsx from "clsx";
import { PageMeta } from "@/components/PageMeta";
import { Poster } from "@/components/Poster";
import { tmdbFetch, tmdbImage, type MediaType, type MovieDetail, type Paginated } from "@/lib/tmdb";
import { movieHref, personHref } from "@/lib/slug";
import { formatNumber, formatRuntime, formatUsd, formatYear } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useT } from "@/i18n/useT";
import { usePreferences, useTmdbLocale } from "@/stores/preferences";
import { useMediaDetail } from "@/features/tv/api";

type Slot = "a" | "b";
const parseKey = (raw: string | null): { type: MediaType; id: number } | null => {
  const m = /^(movie|tv)-(\d+)$/.exec(raw ?? "");
  return m ? { type: m[1] as MediaType, id: Number(m[2]) } : null;
};

/** /compare?a=movie-1&b=tv-2 — compare two movies/series side by side */
export function ComparePage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const a = parseKey(params.get("a"));
  const b = parseKey(params.get("b"));
  const qa = useMediaDetail(a?.type ?? "movie", a?.id ?? NaN);
  const qb = useMediaDetail(b?.type ?? "movie", b?.id ?? NaN);
  const set = (slot: Slot, key: string | null) => {
    const next = new URLSearchParams(params);
    if (key) next.set(slot, key);
    else next.delete(slot);
    setParams(next, { replace: true });
  };
  const swap = () => {
    const next = new URLSearchParams();
    const a = params.get("a");
    const b = params.get("b");
    if (b) next.set("a", b);
    if (a) next.set("b", a);
    setParams(next, { replace: true });
  };
  const A = a ? qa.data : undefined;
  const B = b ? qb.data : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <PageMeta title={A && B ? `${A.title} vs ${B.title}` : t("cmp.title")} />
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("cmp.title")}</h1>
          <p className="text-sm text-muted">{t("cmp.subtitle")}</p>
        </div>
        {(a ?? b) && (
          <button
            type="button"
            onClick={swap}
            aria-label={t("cmp.swap")}
            title={t("cmp.swap")}
            className="grid size-10 place-items-center rounded-full border border-border hover:border-fg"
          >
            <ArrowLeftRight size={18} />
          </button>
        )}
      </header>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <SlotCard
          detail={A}
          loading={!!a && qa.isPending}
          onPick={(k) => {
            set("a", k);
          }}
          onClear={() => {
            set("a", null);
          }}
        />
        <SlotCard
          detail={B}
          loading={!!b && qb.isPending}
          onPick={(k) => {
            set("b", k);
          }}
          onClear={() => {
            set("b", null);
          }}
        />
      </div>
      {A && B && <CompareTable a={A} b={B} />}
    </div>
  );
}

function SlotCard({
  detail,
  loading,
  onPick,
  onClear,
}: {
  detail?: MovieDetail;
  loading: boolean;
  onPick: (key: string) => void;
  onClear: () => void;
}) {
  const t = useT();
  if (loading)
    return (
      <div className="aspect-[2/3] animate-pulse rounded-2xl bg-surface-2 sm:aspect-auto sm:h-72" />
    );
  if (!detail) return <Picker onPick={onPick} />;
  return (
    <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-center sm:flex-row sm:items-start sm:text-left">
      <Link to={movieHref(detail)} className="w-24 shrink-0 sm:w-32">
        <Poster path={detail.poster_path} alt={detail.title} sizes="128px" />
      </Link>
      <div className="min-w-0">
        <Link
          to={movieHref(detail)}
          className="line-clamp-2 font-bold leading-snug hover:underline sm:text-lg"
        >
          {detail.title}
        </Link>
        <p className="text-xs text-muted">
          {formatYear(detail.release_date)} ·{" "}
          {detail.media_type === "tv" ? t("search.tv") : t("search.movies")}
        </p>
        <p className="mt-2 hidden text-sm text-muted sm:line-clamp-4">{detail.overview}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label={t("cmp.change")}
        title={t("cmp.change")}
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-surface-2 text-muted hover:text-fg"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface MultiResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

function Picker({ onPick }: { onPick: (key: string) => void }) {
  const t = useT();
  const { language } = useTmdbLocale();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q.trim());
  const res = useQuery({
    queryKey: ["multi", dq, language],
    queryFn: ({ signal }) =>
      tmdbFetch<Paginated<MultiResult>>(
        "/search/multi",
        { query: dq, language, include_adult: false },
        signal,
      ),
    enabled: dq.length > 1,
  });
  const items = (res.data?.results ?? []).filter((r) => r.media_type !== "person").slice(0, 6);
  return (
    <div className="rounded-2xl border border-dashed border-border p-3">
      <label className="relative block">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
          }}
          placeholder={t("cmp.pick")}
          aria-label={t("cmp.pick")}
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
        />
      </label>
      <ul className="mt-2 space-y-1">
        {items.map((r) => (
          <li key={`${r.media_type}-${r.id}`}>
            <button
              type="button"
              onClick={() => {
                onPick(`${r.media_type}-${r.id}`);
              }}
              className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-surface-2"
            >
              <Poster path={r.poster_path} alt="" sizes="40px" className="w-8 shrink-0 rounded" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-semibold">{r.title ?? r.name}</span>
                <span className="text-xs text-muted">
                  {formatYear(r.release_date ?? r.first_air_date)} ·{" "}
                  {r.media_type === "tv" ? t("search.tv") : t("search.movies")}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!q && <p className="mt-2 text-xs text-muted">{t("cmp.pickHint")}</p>}
    </div>
  );
}

function CompareTable({ a, b }: { a: MovieDetail; b: MovieDetail }) {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const directors = (m: MovieDetail) =>
    m.tv?.created_by.length
      ? m.tv.created_by.map((c) => c.name)
      : m.credits.crew.filter((c) => c.job === "Director").map((c) => c.name);
  const length = (m: MovieDetail) =>
    m.tv
      ? t("tv.seasons", { n: m.tv.number_of_seasons }) +
        ` · ${t("tv.episodes", { n: m.tv.number_of_episodes })}`
      : (formatRuntime(m.runtime) ?? "–");

  interface Row {
    label: string;
    a: string;
    b: string;
    better?: "a" | "b" | null;
  }
  const higher = (x: number, y: number): "a" | "b" | null =>
    x === y || !x || !y ? null : x > y ? "a" : "b";
  const rows: Row[] = [
    {
      label: t("cmp.rating"),
      a: `★ ${a.vote_average.toFixed(1)}`,
      b: `★ ${b.vote_average.toFixed(1)}`,
      better: higher(a.vote_average, b.vote_average),
    },
    {
      label: t("cmp.votes"),
      a: formatNumber(a.vote_count, locale),
      b: formatNumber(b.vote_count, locale),
      better: higher(a.vote_count, b.vote_count),
    },
    {
      label: t("cmp.popularity"),
      a: formatNumber(Math.round(a.popularity), locale),
      b: formatNumber(Math.round(b.popularity), locale),
      better: higher(a.popularity, b.popularity),
    },
    { label: t("cmp.year"), a: formatYear(a.release_date), b: formatYear(b.release_date) },
    { label: t("cmp.length"), a: length(a), b: length(b) },
    {
      label: t("cmp.genres"),
      a: a.genres.map((g) => g.name).join(", ") || "–",
      b: b.genres.map((g) => g.name).join(", ") || "–",
    },
    {
      label: t("cmp.directors"),
      a: directors(a).join(", ") || "–",
      b: directors(b).join(", ") || "–",
    },
  ];
  if (!a.tv && !b.tv) {
    rows.push(
      {
        label: t("movie.budget"),
        a: formatUsd(a.budget, locale),
        b: formatUsd(b.budget, locale),
      },
      {
        label: t("movie.revenue"),
        a: formatUsd(a.revenue, locale),
        b: formatUsd(b.revenue, locale),
        better: higher(a.revenue, b.revenue),
      },
    );
  }

  const shared = useMemo(() => {
    const people = (m: MovieDetail) =>
      new Map([...m.credits.cast.slice(0, 60), ...m.credits.crew].map((p) => [p.id, p]));
    const pa = people(a);
    const out: {
      id: number;
      name: string;
      profile_path: string | null;
      roleA: string;
      roleB: string;
    }[] = [];
    for (const [id, p] of people(b)) {
      const q = pa.get(id);
      if (!q) continue;
      const role = (x: typeof p) => ("character" in x ? x.character : x.job);
      out.push({ id, name: p.name, profile_path: p.profile_path, roleA: role(q), roleB: role(p) });
    }
    return out.slice(0, 12);
  }, [a, b]);
  const sharedGenres = a.genres
    .filter((g) => b.genres.some((x) => x.id === g.id))
    .map((g) => g.name);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td
                  className={clsx(
                    "w-[38%] p-3 text-right align-top",
                    r.better === "a" && "font-bold text-success",
                  )}
                >
                  {r.a}
                </td>
                <th
                  scope="row"
                  className="w-[24%] bg-surface-2/50 p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {r.label}
                </th>
                <td
                  className={clsx(
                    "w-[38%] p-3 align-top",
                    r.better === "b" && "font-bold text-success",
                  )}
                >
                  {r.b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <Users size={18} className="text-accent" /> {t("cmp.shared")}
        </h2>
        {sharedGenres.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {t("cmp.sharedGenres", { list: sharedGenres.join(", ") })}
          </p>
        )}
        {shared.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("cmp.noShared")}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shared.map((p) => (
              <li key={p.id}>
                <Link
                  to={personHref(p)}
                  className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2"
                >
                  <span className="size-10 shrink-0 overflow-hidden rounded-full bg-surface-2">
                    {p.profile_path && (
                      <img
                        src={tmdbImage(p.profile_path, "w185")}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {p.roleA} · {p.roleB}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
