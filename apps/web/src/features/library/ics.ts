import type { Reminder } from "./store";

const pad = (s: string) => s.replace(/[,;\\]/g, (c) => `\\${c}`);

/** Builds .ics content (all-day events) for release reminders */
export function buildIcs(reminders: Reminder[], origin: string, label: (r: Reminder) => string) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const events = reminders.map((r) => {
    const start = r.date.replace(/-/g, "");
    const endDate = new Date(`${r.date}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate.toISOString().slice(0, 10).replace(/-/g, "");
    const type = r.movie.media_type === "tv" ? "tv" : "movie";
    return [
      "BEGIN:VEVENT",
      `UID:lumi-${type}-${r.movie.id}@lumi`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${pad(label(r))}`,
      `URL:${origin}/${type}/${r.movie.id}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT12H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${pad(label(r))}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lumi//VI",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadFile(name: string, content: string | Blob, type = "text/calendar") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
