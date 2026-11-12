import clsx from "clsx";

export function Rating({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 10);
  const color =
    pct >= 70
      ? "text-success ring-success/70"
      : pct >= 40
        ? "text-warning ring-warning/70"
        : "text-danger ring-danger/70";
  return (
    <span
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-[11px] font-bold shadow-card ring-2",
        color,
        className,
      )}
      aria-label={`${value.toFixed(1)} / 10`}
    >
      {pct ? `${pct}%` : "NR"}
    </span>
  );
}
