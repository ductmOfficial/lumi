import type { Locale } from "@/stores/preferences";

const intlLocale = (locale: Locale) => (locale === "vi" ? "vi-VN" : "en-US");

export function formatYear(date: string | null | undefined) {
  return date ? date.slice(0, 4) : "—";
}

export function formatDate(date: string | null | undefined, locale: Locale) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" }).format(
    new Date(date),
  );
}

export function formatUsd(amount: number | null | undefined, locale: Locale) {
  if (!amount) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), { notation: "compact" }).format(n);
}

export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** "3 days ago" in the UI locale */
export function formatRelative(at: number | string | undefined, locale: Locale, now = Date.now()) {
  if (at === undefined) return undefined;
  const t = typeof at === "number" ? at : new Date(at).getTime();
  const diff = (t - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function ageFrom(birthday: string, until?: string | null) {
  const b = new Date(birthday);
  const e = until ? new Date(until) : new Date();
  let age = e.getFullYear() - b.getFullYear();
  if (e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate()))
    age--;
  return age;
}
