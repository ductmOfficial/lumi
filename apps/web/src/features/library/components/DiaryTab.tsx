import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Eye, Star, X } from "lucide-react";
import { Poster } from "@/components/Poster";
import { Segmented } from "@/components/Segmented";
import { Popover } from "@/components/Popover";
import { movieHref, mediaKey } from "@/lib/slug";
import { formatDate, formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { useLibrary, type WatchedEntry } from "../store";
import { RatingPicker } from "./RatingPicker";
import { EmptyState } from "./EmptyState";

/** Watch diary: grouped by month, edit ratings, unmark */
export function DiaryTab() {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const watched = useLibrary((s) => s.watched);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");

  const entries = useMemo(
    () =>
      Object.values(watched)
        .filter((e) => filter === "all" || (e.movie.media_type ?? "movie") === filter)
        .sort((a, b) => b.at - a.at),
    [watched, filter],
  );
  const groups = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
      month: "long",
      year: "numeric",
    });
    const map = new Map<string, WatchedEntry[]>();
    for (const e of entries) {
      const label = fmt.format(e.at);
      map.set(label, [...(map.get(label) ?? []), e]);
    }
    return [...map];
  }, [entries, locale]);

  const all = Object.values(watched);
  const rated = all.filter((e) => e.rating);
  const avg = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : 0;

  if (!all.length)
    return (
      <EmptyState
        icon={<Eye size={36} />}
        title={t("lib.diaryEmpty")}
        hint={t("lib.diaryEmptyHint")}
      />
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel={t("lib.tab.watched")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("watchlist.all") },
            { value: "movie", label: t("search.movies") },
            { value: "tv", label: t("search.tv") },
          ]}
        />
        <p className="text-sm text-muted">
          {t("lib.diarySummary", { n: all.length, r: rated.length })}
          {rated.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 font-semibold text-fg">
              <Star size={13} className="fill-warning text-warning" /> {avg.toFixed(1)}
            </span>
          )}
        </p>
      </div>
      {groups.map(([label, items]) => (
        <section key={label} className="space-y-2">
          <h2 className="text-sm font-bold capitalize text-muted">{label}</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((e) => (
              <DiaryRow
                key={mediaKey(e.movie)}
                entry={e}
                date={formatDate(new Date(e.at).toISOString(), locale)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DiaryRow({ entry, date }: { entry: WatchedEntry; date: string }) {
  const t = useT();
  const setRating = useLibrary((s) => s.setRating);
  const toggleWatched = useLibrary((s) => s.toggleWatched);
  const m = entry.movie;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-3">
      <Link to={movieHref(m)} className="shrink-0">
        <Poster
          path={m.poster_path}
          alt={m.title}
          sizes="56px"
          className="w-12 rounded-md sm:w-14"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={movieHref(m)} className="line-clamp-1 font-semibold hover:underline">
          {m.title}
        </Link>
        <p className="text-xs text-muted">
          {formatYear(m.release_date)} ·{" "}
          {m.media_type === "tv" ? t("search.tv") : t("search.movies")} ·{" "}
          {t("lib.watchedOn", { date })}
        </p>
      </div>
      <Popover
        align="end"
        triggerLabel={t("lib.yourRating")}
        triggerClassName="inline-flex h-8 items-center gap-1 rounded-full border border-border px-2.5 text-sm font-bold tabular-nums hover:border-warning"
        trigger={() => (
          <>
            <Star size={14} className={entry.rating ? "fill-warning text-warning" : "text-muted"} />
            {entry.rating ?? "–"}
          </>
        )}
      >
        {(close) => (
          <div className="w-60 space-y-2">
            <p className="font-semibold">{t("lib.rateQuestion")}</p>
            <RatingPicker
              value={entry.rating}
              onChange={(v) => {
                setRating(m, v);
                close();
              }}
            />
          </div>
        )}
      </Popover>
      <button
        type="button"
        onClick={() => toggleWatched(m)}
        aria-label={t("lib.unmarkWatched")}
        title={t("lib.unmarkWatched")}
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
      >
        <X size={16} />
      </button>
    </li>
  );
}
