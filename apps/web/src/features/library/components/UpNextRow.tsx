import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MovieRow } from "@/components/MovieRow";
import { useT } from "@/i18n/useT";
import type { PreviewMovie } from "@/features/preview/store";
import { mediaKey } from "@/lib/slug";
import { nextUnseen, showStatusQuery } from "../api";
import { useLibrary } from "../store";

const NEW_DAYS = 14;

/**
 * Home "Up next" row: series followed episode by episode → next unwatched episode;
 * "New episode!" badge when the next episode aired within the last 2 weeks.
 */
export function UpNextRow() {
  const t = useT();
  const progress = useLibrary((s) => s.progress);
  const shows = useMemo(
    () =>
      Object.values(progress)
        .sort((a, b) => b.at - a.at)
        .slice(0, 15),
    [progress],
  );
  const statuses = useQueries({ queries: shows.map((p) => showStatusQuery(p.show.id)) });
  const [now] = useState(() => Date.now());

  const items = useMemo(() => {
    const out: { movie: PreviewMovie; sub: string; badge?: string }[] = [];
    shows.forEach((p, i) => {
      const st = statuses[i]?.data;
      if (!st) return;
      const next = nextUnseen(st, new Set(p.seen));
      const movie = { ...p.show, media_type: "tv" as const };
      if (next) {
        const isLatest =
          st.last?.season_number === next.season && st.last.episode_number === next.episode;
        const fresh =
          isLatest && st.last?.air_date && now - Date.parse(st.last.air_date) < NEW_DAYS * 864e5;
        out.push({
          movie,
          sub: t("lib.upNextEp", { s: next.season, e: next.episode }),
          badge: fresh ? t("lib.newEpisode") : undefined,
        });
      } else if (st.next?.air_date) {
        // caught up → show the next episode's date
        out.push({
          movie,
          sub: t("lib.caughtUpNext", {
            s: st.next.season_number,
            e: st.next.episode_number,
            date: st.next.air_date.slice(5).split("-").reverse().join("/"),
          }),
        });
      }
    });
    return out;
  }, [shows, statuses, t, now]);

  if (!shows.length || (!items.length && statuses.every((s) => !s.isPending))) return null;
  const subs = new Map(items.map((x) => [mediaKey(x.movie), x]));
  return (
    <MovieRow
      title={t("lib.upNext")}
      reason={t("lib.upNextReason")}
      movies={items.map((x) => x.movie)}
      isLoading={statuses.some((s) => s.isPending) && !items.length}
      variant="landscape"
      subtitleFor={(m) => subs.get(mediaKey(m))?.sub}
      badgeFor={(m) => subs.get(mediaKey(m))?.badge}
    />
  );
}
