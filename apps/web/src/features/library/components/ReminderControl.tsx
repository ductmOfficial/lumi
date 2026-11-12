import { Bell, BellRing, CalendarPlus } from "lucide-react";
import clsx from "clsx";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { toast } from "@/stores/toast";
import { formatDate } from "@/lib/format";
import { Popover } from "@/components/Popover";
import type { MovieLite } from "@/features/personalization/types";
import { useHasReminder, useLibrary } from "../store";
import { askNotificationPermission, useReminderLabel } from "../reminders";
import { buildIcs, downloadFile } from "../ics";

/** "Remind me" button for upcoming movies/series: set a reminder, add to calendar (.ics), cancel */
export function ReminderControl({ movie, date }: { movie: MovieLite; date: string }) {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const on = useHasReminder(movie);
  const toggle = useLibrary((s) => s.toggleReminder);
  const label = useReminderLabel();
  const cls = clsx(
    "inline-flex h-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4",
    on ? "bg-accent/15 text-accent hover:bg-accent/25" : "bg-surface-2 hover:bg-border",
  );

  if (!on) {
    return (
      <button
        type="button"
        onClick={() => {
          toggle(movie, date);
          toast(t("lib.reminderSet", { date: formatDate(date, locale) }));
          void askNotificationPermission();
        }}
        aria-label={t("lib.remindMe")}
        title={t("lib.remindMe")}
        className={cls}
      >
        <Bell size={18} />
        <span className="hidden sm:inline">{t("lib.remindMe")}</span>
      </button>
    );
  }

  return (
    <Popover
      triggerLabel={t("lib.reminderOn")}
      triggerClassName={cls}
      trigger={() => (
        <>
          <BellRing size={18} />
          <span className="hidden sm:inline">{t("lib.reminderOn")}</span>
        </>
      )}
    >
      {(close) => (
        <div className="w-60 space-y-2">
          <p className="font-semibold">
            {t("lib.reminderFor", { date: formatDate(date, locale) })}
          </p>
          <button
            type="button"
            onClick={() => {
              downloadFile(
                `${movie.title}.ics`,
                buildIcs([{ movie, date }], window.location.origin, label),
              );
              close();
            }}
            className="flex w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 font-semibold hover:bg-border"
          >
            <CalendarPlus size={16} /> {t("lib.addToCalendar")}
          </button>
          <button
            type="button"
            onClick={() => {
              toggle(movie, date);
              toast(t("lib.reminderOff"));
              close();
            }}
            className="text-xs font-semibold text-danger hover:underline"
          >
            {t("lib.cancelReminder")}
          </button>
        </div>
      )}
    </Popover>
  );
}
