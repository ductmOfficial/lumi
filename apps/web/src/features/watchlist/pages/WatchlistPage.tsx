import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Bookmark } from "lucide-react";
import { Segmented } from "@/components/Segmented";
import { MovieGrid } from "@/components/MovieGrid";
import { PageMeta } from "@/components/PageMeta";
import { useT } from "@/i18n/useT";
import { usePersonalization } from "@/features/personalization/store";
import { useLibrary } from "@/features/library/store";
import { DiaryTab } from "@/features/library/components/DiaryTab";
import { ListsTab } from "@/features/library/components/ListsTab";
import { RemindersTab } from "@/features/library/components/RemindersTab";
import { EmptyState } from "@/features/library/components/EmptyState";

type Tab = "want" | "watched" | "lists" | "reminders";
const TABS: Tab[] = ["want", "watched", "lists", "reminders"];

/** Your library: Want to watch · Watched (diary) · Custom lists · Reminders */
export function WatchlistPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "want";
  const watchlistCount = usePersonalization((s) => s.watchlist.length);
  const watchedCount = useLibrary((s) => Object.keys(s.watched).length);
  const listCount = useLibrary((s) => s.lists.length);
  const reminderCount = useLibrary((s) => Object.keys(s.reminders).length);
  const counts: Record<Tab, number> = {
    want: watchlistCount,
    watched: watchedCount,
    lists: listCount,
    reminders: reminderCount,
  };

  const setTab = (next: Tab) => {
    setParams(next === "want" ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="mx-auto max-w-app space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <PageMeta title={t("watchlist.title")} />
      <h1 className="text-2xl font-bold">{t("watchlist.title")}</h1>
      <div
        role="tablist"
        aria-label={t("watchlist.title")}
        className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((k) => (
          <button
            type="button"
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => {
              setTab(k);
            }}
            className={
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition " +
              (tab === k ? "bg-fg text-bg" : "bg-surface-2 text-fg hover:bg-border")
            }
          >
            {t(`lib.tab.${k}`)}
            {counts[k] > 0 && <span className="ml-1.5 text-xs opacity-60">{counts[k]}</span>}
          </button>
        ))}
      </div>
      {tab === "want" && <WantTab />}
      {tab === "watched" && <DiaryTab />}
      {tab === "lists" && <ListsTab />}
      {tab === "reminders" && <RemindersTab />}
    </div>
  );
}

function WantTab() {
  const t = useT();
  const watchlist = usePersonalization((s) => s.watchlist);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");
  const items = watchlist.filter(
    (e) => filter === "all" || (e.movie.media_type ?? "movie") === filter,
  );
  if (!watchlist.length)
    return (
      <EmptyState
        icon={<Bookmark size={36} />}
        title={t("watchlist.empty")}
        hint={t("watchlist.emptyHint")}
      >
        <Link
          to="/discover"
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
        >
          {t("nav.discover")}
        </Link>
      </EmptyState>
    );
  return (
    <div className="space-y-4">
      <Segmented
        ariaLabel={t("watchlist.title")}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: t("watchlist.all") },
          { value: "movie", label: t("search.movies") },
          { value: "tv", label: t("search.tv") },
        ]}
      />
      <MovieGrid movies={items.map((e) => e.movie)} />
    </div>
  );
}
