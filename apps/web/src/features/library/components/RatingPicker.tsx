import clsx from "clsx";
import { useT } from "@/i18n/useT";

/** Picks a 1–10 rating (click the current rating again to clear it) */
export function RatingPicker({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number | null) => void;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("lib.yourRating")} className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => {
            onChange(value === n ? null : n);
          }}
          className={clsx(
            "h-9 rounded-lg text-sm font-bold tabular-nums transition",
            value !== undefined && n <= value
              ? "bg-warning text-black"
              : "bg-surface-2 hover:bg-border",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
