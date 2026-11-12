import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { useT } from "@/i18n/useT";

/* Small hand-built HTML/CSS charts (no extra library):
 * thin marks, 4px-rounded bar ends on the baseline, 2px gaps between segments, faint grid/axes,
 * hover tooltips, text in text colors (never series colors), always paired with a data table. */

export function ChartCard({
  title,
  subtitle,
  legend,
  children,
  table,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  children: ReactNode;
  table?: ReactNode;
}) {
  const t = useT();
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {legend}
      </div>
      <div className="flex-1">{children}</div>
      {!!table && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer select-none text-muted hover:text-fg">
            {t("insights.showTable")}
          </summary>
          <div className="mt-2 overflow-x-auto">{table}</div>
        </details>
      )}
    </section>
  );
}

export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className={clsx("h-2.5 w-2.5 rounded-sm", i.className)} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums leading-none">{value}</p>
      {!!hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Rendered only while shown: a hidden (opacity-0) absolutely positioned tooltip near the viewport edge
 * still widens the page's scrollable area and causes horizontal overflow on mobile.
 */
function Tooltip({ children, show }: { children: ReactNode; show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-fade-in overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-card"
    >
      {children}
    </div>
  );
}

export interface BarSegment {
  value: number;
  className: string;
  label: string;
}

/**
 * Horizontal bars (optionally stacked). Each row: label on the left, bar, value on the right.
 * Hovering a row → detailed tooltip.
 */
export function BarList({
  rows,
  max,
  format = String,
}: {
  rows: { key: string | number; label: string; segments: BarSegment[] }[];
  max?: number;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<string | number | null>(null);
  const top = max ?? Math.max(1, ...rows.map((r) => r.segments.reduce((a, s) => a + s.value, 0)));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const total = r.segments.reduce((a, s) => a + s.value, 0);
        return (
          <li
            key={r.key}
            className="grid grid-cols-[minmax(0,7rem)_1fr_2.5rem] items-center gap-3 sm:grid-cols-[minmax(0,9rem)_1fr_2.5rem]"
            onMouseEnter={() => {
              setHover(r.key);
            }}
            onMouseLeave={() => {
              setHover(null);
            }}
          >
            <span className="truncate text-sm">{r.label}</span>
            <div className="relative h-3">
              <div className="flex h-full gap-[2px]" style={{ width: `${(total / top) * 100}%` }}>
                {r.segments
                  .filter((s) => s.value > 0)
                  .map((s, i, arr) => (
                    <div
                      key={s.label}
                      className={clsx(
                        "h-full",
                        s.className,
                        i === arr.length - 1 && "rounded-r-[4px]",
                        hover === r.key && "brightness-110",
                      )}
                      style={{ flexGrow: s.value, flexBasis: 0 }}
                    />
                  ))}
              </div>
              <Tooltip show={hover === r.key}>
                <span className="font-semibold">{r.label}</span>
                {r.segments.map((s) => (
                  <span key={s.label} className="ml-2 inline-flex items-center gap-1 text-muted">
                    <span className={clsx("h-2 w-2 rounded-sm", s.className)} />
                    {s.label} <span className="font-semibold text-fg">{format(s.value)}</span>
                  </span>
                ))}
              </Tooltip>
            </div>
            <span className="text-right text-sm tabular-nums text-muted">{format(total)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Single-series vertical bar chart. Faint 3-level horizontal grid; sparse X labels (every `labelEvery` bars).
 */
export function ColumnChart({
  data,
  height = 160,
  barClassName = "bg-viz-1",
  labelEvery = 1,
  tooltip,
}: {
  data: { key: string; label: string; value: number }[];
  height?: number;
  barClassName?: string;
  labelEvery?: number;
  tooltip: (d: { key: string; label: string; value: number }) => ReactNode;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 2) * 2 || 2;
  const grid = [niceMax, niceMax / 2, 0];
  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* grid + Y-axis labels */}
        {grid.map((g) => (
          <div
            key={g}
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ top: `${(1 - g / niceMax) * 100}%` }}
          >
            <span className="w-6 -translate-y-1/2 text-right text-[10px] tabular-nums text-muted">
              {g}
            </span>
            <span
              className={clsx(
                "h-px flex-1 -translate-y-1/2",
                g === 0 ? "bg-border" : "bg-border/50",
              )}
            />
          </div>
        ))}
        <div className="absolute inset-y-0 left-8 right-0 flex items-end justify-center gap-[2px]">
          {data.map((d) => (
            <div
              key={d.key}
              className="relative flex h-full max-w-14 flex-1 items-end"
              onMouseEnter={() => {
                setHover(d.key);
              }}
              onMouseLeave={() => {
                setHover(null);
              }}
            >
              {/* hover area wider than the bar */}
              <div
                className={clsx(
                  "w-full rounded-t-[4px] transition",
                  barClassName,
                  hover && hover !== d.key && "opacity-50",
                )}
                style={{ height: `${(d.value / niceMax) * 100}%`, minHeight: d.value ? 2 : 0 }}
              />
              <Tooltip show={hover === d.key}>{tooltip(d)}</Tooltip>
            </div>
          ))}
        </div>
      </div>
      {/* X-axis labels: centered under the bar, never clipped for narrow bars */}
      <div className="ml-8 mt-1.5 flex h-4 justify-center gap-[2px]">
        {data.map((d, i) => (
          <span key={d.key} className="relative max-w-14 flex-1">
            {(i % labelEvery === 0 || i === data.length - 1) && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted">
                {d.label}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-border text-muted">
          {head.map((h) => (
            <th key={h} className="py-1.5 pr-3 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r[0])} className="border-b border-border/50">
            {r.map((c, j) => (
              <td key={head[j] ?? String(c)} className="py-1.5 pr-3 tabular-nums">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
