import type { ReactNode } from "react";
import clsx from "clsx";
import { HIGHLIGHT_TONES, type HighlightTone } from "./highlightTones";

interface HighlightCardProps {
  tone: HighlightTone;
  /** large icon / emoji at the top */
  icon?: ReactNode;
  /** small line above the title */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  size?: "md" | "lg";
  className?: string;
}

/** Highlight block for "one-line" posts: gradient background + large centered text. */
export function HighlightCard({
  tone,
  icon,
  eyebrow,
  title,
  subtitle,
  children,
  size = "md",
  className,
}: HighlightCardProps) {
  return (
    <div
      className={clsx(
        "relative isolate flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br px-6 text-center text-white",
        HIGHLIGHT_TONES[tone],
        size === "lg" ? "min-h-64 py-12" : "min-h-44 py-8",
        className,
      )}
    >
      {/* decorative pattern */}
      <div className="pointer-events-none absolute -right-10 -top-10 -z-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 -z-10 h-44 w-44 rounded-full bg-black/15 blur-2xl" />
      {!!icon && <div className="mb-3 text-4xl leading-none drop-shadow">{icon}</div>}
      {!!eyebrow && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          {eyebrow}
        </p>
      )}
      <p
        className={clsx(
          "font-black leading-tight drop-shadow-sm",
          size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
        )}
      >
        {title}
      </p>
      {!!subtitle && <p className="mt-2 text-sm text-white/85">{subtitle}</p>}
      {!!children && <div className="mt-4">{children}</div>}
    </div>
  );
}
