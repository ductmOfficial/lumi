import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Bell, BellRing, CalendarPlus, X } from "lucide-react";
import { Poster } from "@/components/Poster";
import { mediaKey, movieHref } from "@/lib/slug";
import { formatDate } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { useLibrary } from "../store";
import { buildIcs, downloadFile } from "../ics";
import { askNotificationPermission, useReminderLabel } from "../reminders";
import { EmptyState } from "./EmptyState";

const DAY = 24 * 3600e3;

/** Release reminders: countdown, add to calendar, enable browser notifications */
export function RemindersTab() {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const reminders = useLibrary((s) => s.reminders);
  const toggle = useLibrary((s) => s.toggleReminder);
  const label = useReminderLabel();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [perm, setPerm] = useState(() =>
    "Notification" in window ? Notification.permission : "denied",
  );
  const list = useMemo(
    () => Object.values(reminders).sort((a, b) => a.date.localeCompare(b.date)),
    [reminders],
  );

  if (!list.length)
    return (
      <EmptyState
        icon={<Bell size={36} />}
        title={t("lib.remindersEmpty")}
        hint={t("lib.remindersEmptyHint")}
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            downloadFile("lumi.ics", buildIcs(list, window.location.origin, label));
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
        >
          <CalendarPlus size={16} /> {t("lib.addAllToCalendar")}
        </button>
        {perm === "default" && (
          <button
            type="button"
            onClick={async () => {
              await askNotificationPermission();
              setPerm(Notification.permission);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-fg"
          >
            <BellRing size={16} /> {t("lib.enableNotifications")}
          </button>
        )}
        {perm === "granted" && (
          <p className="self-center text-xs text-success">{t("lib.notificationsOn")}</p>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => {
          const days = Math.round((Date.parse(r.date) - Date.parse(today)) / DAY);
          return (
            <li
              key={mediaKey(r.movie)}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-3"
            >
              <Link to={movieHref(r.movie)} className="shrink-0">
                <Poster
                  path={r.movie.poster_path}
                  alt={r.movie.title}
                  sizes="56px"
                  className="w-12 rounded-md sm:w-14"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={movieHref(r.movie)}
                  className="line-clamp-1 font-semibold hover:underline"
                >
                  {r.movie.title}
                </Link>
                <p className="text-xs text-muted">{formatDate(r.date, locale)}</p>
                <p
                  className={
                    "text-xs font-semibold " + (days <= 0 ? "text-success" : "text-accent")
                  }
                >
                  {days > 0
                    ? t("lib.daysLeft", { n: days })
                    : days === 0
                      ? t("lib.releaseToday")
                      : t("lib.released")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  downloadFile(
                    `${r.movie.title}.ics`,
                    buildIcs([r], window.location.origin, label),
                  );
                }}
                aria-label={t("lib.addToCalendar")}
                title={t("lib.addToCalendar")}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-accent"
              >
                <CalendarPlus size={16} />
              </button>
              <button
                type="button"
                onClick={() => toggle(r.movie, r.date)}
                aria-label={t("lib.cancelReminder")}
                title={t("lib.cancelReminder")}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
              >
                <X size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
