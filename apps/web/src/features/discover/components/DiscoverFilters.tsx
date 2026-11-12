import clsx from "clsx";
import { useT } from "@/i18n/useT";
import type { MessageKey } from "@lumi/i18n";
import type { DiscoverFilters as Filters, SortOption } from "../api/queries";
import { sortOptionsFor, useGenres, useWatchProviders } from "../api/queries";
import {
  DECADES,
  FORMAT_LABEL,
  LANGUAGES,
  STATUS_LABEL,
  THEMES,
  TV_FORMAT,
  TV_STATUS,
  languageName,
  type TvFormat,
  type TvStatus,
} from "../catalog";
import { usePreferences } from "@/stores/preferences";

const SORT_LABEL: Record<SortOption, MessageKey> = {
  "popularity.desc": "discover.sort.popularity",
  "vote_average.desc": "discover.sort.rating",
  "primary_release_date.desc": "discover.sort.newest",
  "revenue.desc": "discover.sort.revenue",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 2 - 1950 }, (_, i) => CURRENT_YEAR + 1 - i);
const RATINGS = [5, 6, 7, 8];

const selectClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none";

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

export function DiscoverFilters({ filters, onChange, onReset }: Props) {
  const t = useT();
  const genres = useGenres(filters.media);
  const providers = useWatchProviders(filters.media);
  const locale = usePreferences((s) => s.locale);
  const langs = LANGUAGES.map((l) => l.code);
  if (filters.lang && !langs.includes(filters.lang)) langs.push(filters.lang);

  const toggleGenre = (id: number) => {
    onChange({
      genres: filters.genres.includes(id)
        ? filters.genres.filter((g) => g !== id)
        : [...filters.genres, id],
    });
  };

  return (
    <div className="space-y-6 lg:rounded-xl lg:border lg:border-border lg:bg-surface lg:p-4">
      {/* phim / series */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["movie", "tv"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={filters.media === m}
            onClick={() => {
              onChange({ media: m });
            }}
            className={clsx(
              "rounded-lg py-2 text-sm font-semibold transition",
              filters.media === m ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
            )}
          >
            {m === "movie" ? t("search.movies") : t("search.tv")}
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">{t("discover.sortBy")}</span>
        <select
          className={selectClass}
          value={filters.sort}
          onChange={(e) => {
            onChange({ sort: e.target.value as SortOption });
          }}
        >
          {sortOptionsFor(filters.media).map((s) => (
            <option key={s} value={s}>
              {t(SORT_LABEL[s])}
            </option>
          ))}
        </select>
      </label>

      {filters.media === "tv" && (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">
              {t("discover.status")}
            </span>
            <select
              className={selectClass}
              value={filters.status ?? ""}
              onChange={(e) => {
                onChange({ status: (e.target.value || undefined) as TvStatus | undefined });
              }}
            >
              <option value="">{t("discover.any")}</option>
              {(Object.keys(TV_STATUS) as TvStatus[]).map((k) => (
                <option key={k} value={k}>
                  {t(STATUS_LABEL[k])}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">
              {t("discover.format")}
            </span>
            <select
              className={selectClass}
              value={filters.format ?? ""}
              onChange={(e) => {
                onChange({ format: (e.target.value || undefined) as TvFormat | undefined });
              }}
            >
              <option value="">{t("discover.any")}</option>
              {(Object.keys(TV_FORMAT) as TvFormat[]).map((k) => (
                <option key={k} value={k}>
                  {t(FORMAT_LABEL[k])}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">{t("discover.year")}</span>
        <select
          className={selectClass}
          value={filters.year ?? ""}
          onChange={(e) => {
            onChange({ year: e.target.value ? Number(e.target.value) : undefined });
          }}
        >
          <option value="">{t("discover.anyYear")}</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">{t("discover.decade")}</span>
        <select
          className={selectClass}
          value={filters.decade ?? ""}
          onChange={(e) => {
            onChange({ decade: e.target.value ? Number(e.target.value) : undefined });
          }}
        >
          <option value="">{t("discover.anyDecade")}</option>
          {DECADES.map((d) => (
            <option key={d} value={d}>
              {t("discover.decadeLabel", { n: d })}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">{t("discover.language")}</span>
        <select
          className={selectClass}
          value={filters.lang ?? ""}
          onChange={(e) => {
            onChange({ lang: e.target.value || undefined });
          }}
        >
          <option value="">{t("discover.anyLanguage")}</option>
          {langs.map((code) => (
            <option key={code} value={code}>
              {languageName(code, locale)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">{t("hub.themes")}</span>
        <select
          className={selectClass}
          value={filters.theme ?? ""}
          onChange={(e) => {
            onChange({ theme: e.target.value || undefined });
          }}
        >
          <option value="">{t("discover.any")}</option>
          {THEMES.map((th) => (
            <option key={th.slug} value={th.slug}>
              {t(th.label)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">{t("discover.provider")}</span>
        <select
          className={selectClass}
          value={filters.provider ?? ""}
          onChange={(e) => {
            onChange({ provider: e.target.value ? Number(e.target.value) : undefined });
          }}
        >
          <option value="">{t("discover.anyProvider")}</option>
          {providers.data?.slice(0, 30).map((p) => (
            <option key={p.provider_id} value={p.provider_id}>
              {p.provider_name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">
          {t("discover.minRating")}
        </span>
        <select
          className={selectClass}
          value={filters.minRating ?? ""}
          onChange={(e) => {
            onChange({ minRating: e.target.value ? Number(e.target.value) : undefined });
          }}
        >
          <option value="">{t("discover.any")}</option>
          {RATINGS.map((r) => (
            <option key={r} value={r}>
              ≥ {r}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-wide text-muted">
          {t("discover.genres")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {genres.data?.map((g) => {
            const active = filters.genres.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  toggleGenre(g.id);
                }}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-muted hover:text-fg",
                )}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button type="button" onClick={onReset} className="text-sm text-accent hover:underline">
        {t("discover.reset")}
      </button>
    </div>
  );
}
