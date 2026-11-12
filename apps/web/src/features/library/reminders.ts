import { useT } from "@/i18n/useT";
import type { Reminder } from "./store";

export function useReminderLabel() {
  const t = useT();
  return (r: Reminder) =>
    t(r.movie.media_type === "tv" ? "lib.icsTv" : "lib.icsMovie", { title: r.movie.title });
}

/** Asks for browser notification permission (if not asked yet) */
export async function askNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // old / blocked browser
  }
}
