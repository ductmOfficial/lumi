import { useState } from "react";
import { CircleCheckBig, Eye, Star } from "lucide-react";
import clsx from "clsx";
import { useT } from "@/i18n/useT";
import { toast } from "@/stores/toast";
import { Popover } from "@/components/Popover";
import type { MovieLite } from "@/features/personalization/types";
import { useLibrary, useWatched } from "../store";
import { RatingPicker } from "./RatingPicker";

/**
 * "Watched" button on the detail page: first click → mark as watched and open the 1–10 rating panel;
 * already watched → click to change the rating or unmark.
 */
export function WatchedControl({ movie }: { movie: MovieLite }) {
  const t = useT();
  const entry = useWatched(movie);
  const toggleWatched = useLibrary((s) => s.toggleWatched);
  const setRating = useLibrary((s) => s.setRating);
  const [open, setOpen] = useState(false);

  const onOpenChange = (v: boolean) => {
    if (v && !entry) {
      toggleWatched(movie);
      toast(t("lib.markedWatched"));
    }
    setOpen(v);
  };

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      triggerLabel={entry ? t("lib.watched") : t("lib.markWatched")}
      triggerClassName={clsx(
        "inline-flex h-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4",
        entry ? "bg-success/15 text-success hover:bg-success/25" : "bg-surface-2 hover:bg-border",
      )}
      trigger={() => (
        <>
          {entry ? <CircleCheckBig size={18} /> : <Eye size={18} />}
          <span className="hidden sm:inline">
            {entry ? t("lib.watched") : t("lib.markWatched")}
          </span>
          {!!entry?.rating && (
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <Star size={13} className="fill-current" />
              {entry.rating}
            </span>
          )}
        </>
      )}
    >
      {(close) => (
        <div className="w-64 space-y-3">
          <p className="font-semibold">{t("lib.rateQuestion")}</p>
          <RatingPicker
            value={entry?.rating}
            onChange={(v) => {
              setRating(movie, v);
              if (v) {
                toast(t("lib.rated", { n: v }));
                close();
              }
            }}
          />
          <p className="text-xs text-muted">{t("lib.rateHint")}</p>
          <button
            type="button"
            onClick={() => {
              toggleWatched(movie);
              toast(t("lib.unmarkedWatched"));
              close();
            }}
            className="text-xs font-semibold text-danger hover:underline"
          >
            {t("lib.unmarkWatched")}
          </button>
        </div>
      )}
    </Popover>
  );
}
