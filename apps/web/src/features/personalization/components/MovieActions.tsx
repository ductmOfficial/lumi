import { useState } from "react";
import clsx from "clsx";
import { useT } from "@/i18n/useT";
import { ActionTip } from "@/components/ActionTip";
import { Bell, BellRing, CircleCheckBig, Eye } from "lucide-react";
import { useHasReminder, useLibrary, useWatched } from "@/features/library/store";
import { askNotificationPermission } from "@/features/library/reminders";
import { toast } from "@/stores/toast";
import { CheckIcon, PlusIcon, ThumbDownIcon, ThumbUpIcon } from "@/components/icons";
import { useIsInWatchlist, usePersonalization, useReaction } from "../store";
import type { MovieLite } from "../types";

interface Props {
  movie: MovieLite;
  /** 'round': icon-only round buttons (preview card). 'labeled': buttons with text (profile page) */
  variant?: "round" | "labeled";
  className?: string;
}

export function MovieActions({ movie, variant = "round", className }: Props) {
  const t = useT();
  const inList = useIsInWatchlist(movie);
  const reaction = useReaction(movie);
  const toggleWatchlist = usePersonalization((s) => s.toggleWatchlist);
  const setReaction = usePersonalization((s) => s.setReaction);

  const onWatchlist = () => {
    const added = toggleWatchlist(movie);
    toast(added ? t("toast.addedWatchlist") : t("toast.removedWatchlist"));
  };
  // 4th button (round variant): upcoming → reminder; released → mark as watched
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const upcoming = !!movie.release_date && movie.release_date > today;
  const watched = !!useWatched(movie);
  const reminded = useHasReminder(movie);
  const toggleWatched = useLibrary((s) => s.toggleWatched);
  const toggleReminder = useLibrary((s) => s.toggleReminder);
  const onFourth = () => {
    if (upcoming) {
      const on = toggleReminder(movie, movie.release_date);
      toast(on ? t("lib.reminderSet", { date: movie.release_date }) : t("lib.reminderOff"));
      if (on) void askNotificationPermission();
    } else {
      toast(toggleWatched(movie) ? t("lib.markedWatched") : t("lib.unmarkedWatched"));
    }
  };

  const onReact = (r: "like" | "dislike") => {
    const next = reaction === r ? null : r;
    setReaction(movie, next);
    if (next) toast(next === "like" ? t("toast.liked") : t("toast.disliked"));
  };

  // explains how each button affects personalization
  const tips = {
    watchlist: {
      title: inList ? t("actions.inWatchlist") : t("actions.addWatchlist"),
      hint: inList ? t("actions.hint.inWatchlist") : t("actions.hint.addWatchlist"),
    },
    like: {
      title: t("actions.like"),
      hint: reaction === "like" ? t("actions.hint.undo") : t("actions.hint.like"),
    },
    dislike: {
      title: t("actions.dislike"),
      hint: reaction === "dislike" ? t("actions.hint.undo") : t("actions.hint.dislike"),
    },
  };

  if (variant === "labeled") {
    const base =
      "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition";
    return (
      <div className={clsx("flex flex-wrap gap-2", className)}>
        <ActionTip {...tips.watchlist} className="min-w-0 flex-1 sm:flex-none">
          {(tip) => (
            <button
              type="button"
              onClick={onWatchlist}
              aria-pressed={inList}
              aria-describedby={tip}
              className={clsx(
                base,
                "w-full min-w-0 justify-center",
                inList
                  ? "bg-surface-2 text-fg hover:bg-border"
                  : "bg-accent text-accent-fg hover:opacity-90",
              )}
            >
              {inList ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
              <span className="truncate sm:hidden">
                {inList ? t("actions.inWatchlist") : t("actions.addWatchlistShort")}
              </span>
              <span className="hidden sm:inline">
                {inList ? t("actions.inWatchlist") : t("actions.addWatchlist")}
              </span>
            </button>
          )}
        </ActionTip>
        <ActionTip {...tips.like} align="center">
          {(tip) => (
            <button
              type="button"
              onClick={() => {
                onReact("like");
              }}
              aria-pressed={reaction === "like"}
              aria-label={t("actions.like")}
              aria-describedby={tip}
              className={clsx(
                base,
                "bg-surface-2 px-3 hover:bg-border sm:px-4",
                reaction === "like" && "text-accent",
              )}
            >
              <ThumbUpIcon size={18} fill={reaction === "like" ? "currentColor" : "none"} />
              <span className="hidden sm:inline">{t("actions.like")}</span>
            </button>
          )}
        </ActionTip>
        <ActionTip {...tips.dislike} align="center">
          {(tip) => (
            <button
              type="button"
              onClick={() => {
                onReact("dislike");
              }}
              aria-pressed={reaction === "dislike"}
              aria-label={t("actions.dislike")}
              aria-describedby={tip}
              className={clsx(
                base,
                "bg-surface-2 px-3 hover:bg-border",
                reaction === "dislike" && "text-danger",
              )}
            >
              <ThumbDownIcon size={18} fill={reaction === "dislike" ? "currentColor" : "none"} />
            </button>
          )}
        </ActionTip>
      </div>
    );
  }

  const round =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-surface/80 transition hover:border-fg";
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <ActionTip {...tips.watchlist}>
        {(tip) => (
          <button
            type="button"
            onClick={onWatchlist}
            aria-pressed={inList}
            aria-label={tips.watchlist.title}
            aria-describedby={tip}
            className={clsx(round, inList && "border-accent text-accent")}
          >
            {inList ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
          </button>
        )}
      </ActionTip>
      <ActionTip {...tips.like}>
        {(tip) => (
          <button
            type="button"
            onClick={() => {
              onReact("like");
            }}
            aria-pressed={reaction === "like"}
            aria-label={t("actions.like")}
            aria-describedby={tip}
            className={clsx(round, reaction === "like" && "border-accent text-accent")}
          >
            <ThumbUpIcon size={17} fill={reaction === "like" ? "currentColor" : "none"} />
          </button>
        )}
      </ActionTip>
      <ActionTip {...tips.dislike}>
        {(tip) => (
          <button
            type="button"
            onClick={() => {
              onReact("dislike");
            }}
            aria-pressed={reaction === "dislike"}
            aria-label={t("actions.dislike")}
            aria-describedby={tip}
            className={clsx(round, reaction === "dislike" && "border-danger text-danger")}
          >
            <ThumbDownIcon size={17} fill={reaction === "dislike" ? "currentColor" : "none"} />
          </button>
        )}
      </ActionTip>
      <ActionTip
        title={
          upcoming
            ? reminded
              ? t("lib.reminderOn")
              : t("lib.remindMe")
            : watched
              ? t("lib.watched")
              : t("lib.markWatched")
        }
        hint={
          upcoming ? t("lib.hint.remind") : watched ? t("actions.hint.undo") : t("lib.hint.watched")
        }
      >
        {(tip) => (
          <button
            type="button"
            onClick={onFourth}
            aria-pressed={upcoming ? reminded : watched}
            aria-label={upcoming ? t("lib.remindMe") : t("lib.markWatched")}
            aria-describedby={tip}
            className={clsx(
              round,
              (upcoming ? reminded : watched) && "border-success text-success",
            )}
          >
            {upcoming ? (
              reminded ? (
                <BellRing size={17} />
              ) : (
                <Bell size={17} />
              )
            ) : watched ? (
              <CircleCheckBig size={17} />
            ) : (
              <Eye size={17} />
            )}
          </button>
        )}
      </ActionTip>
    </div>
  );
}
