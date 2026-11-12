import { Link } from "react-router";
import { keywordHref } from "@/lib/slug";
import { useT } from "@/i18n/useT";
import { TagIcon } from "@/components/icons";
import { useKeywordSuggestions } from "../api/queries";

/** Row of related TMDB keyword chips → click to browse movies/series by that keyword */
export function KeywordSuggestions({ query, media }: { query: string; media: "movie" | "tv" }) {
  const t = useT();
  const { data } = useKeywordSuggestions(query);
  if (!data?.length) return null;
  return (
    <section aria-label={t("search.keywords")} className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <TagIcon size={14} /> {t("search.keywords")}
      </h2>
      {/* mobile: one horizontally scrolling row; tablet and up: wraps */}
      <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {data.map((k) => (
          <li key={k.id} className="shrink-0">
            <Link
              to={keywordHref(k.id, media)}
              className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition hover:border-accent hover:text-accent"
            >
              <span className="text-muted">#</span>
              {k.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
