import { useEffect } from "react";
import { mediaKey } from "@/lib/slug";
import { useT } from "@/i18n/useT";
import { toast } from "@/stores/toast";
import { useLibrary } from "../store";

/**
 * On app start: reminders that are due but not yet shown → browser notification (if allowed) + toast.
 * There is no server, so reminders only fire while the app is open.
 */
export function ReminderNotifier() {
  const t = useT();
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const { reminders, markNotified } = useLibrary.getState();
    const due = Object.values(reminders).filter((r) => !r.notified && r.date <= today);
    if (!due.length) return;
    const body = due.map((r) => r.movie.title).join(", ");
    const title = t("lib.notifyTitle", { n: due.length });
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "/favicon.svg", tag: "lumi-reminders" });
      } catch {
        // some mobile browsers only allow notifications through a service worker
      }
    }
    toast(`${title}: ${body}`);
    due.forEach((r) => {
      markNotified(mediaKey(r.movie));
    });
  }, [t]);
  return null;
}
