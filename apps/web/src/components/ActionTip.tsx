import { useId, type ReactElement, type ReactNode } from "react";
import clsx from "clsx";

interface Props {
  /** action name (bold line) */
  title: ReactNode;
  /** what it does (secondary line) */
  hint?: ReactNode;
  /** render prop receiving the id for the button's aria-describedby */
  children: (describedBy: string) => ReactElement;
  className?: string;
  /** tooltip alignment relative to the button */
  align?: "start" | "center" | "end";
}

/**
 * Explanatory tooltip for action buttons: shown on hover (with a small delay so it is not annoying) or on keyboard focus.
 * Touch screens have no hover → the toast after tapping carries the explanation.
 */
export function ActionTip({ title, hint, children, className, align = "start" }: Props) {
  const id = useId();
  return (
    <span className={clsx("group/tip relative inline-flex", className)}>
      {children(id)}
      <span
        id={id}
        role="tooltip"
        className={clsx(
          "pointer-events-none absolute bottom-full z-30 mb-2 w-max max-w-56 rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs leading-snug text-fg shadow-xl",
          "invisible translate-y-1 opacity-0 transition duration-150",
          "pointer-fine:group-hover/tip:visible pointer-fine:group-hover/tip:translate-y-0 pointer-fine:group-hover/tip:opacity-100 pointer-fine:group-hover/tip:delay-300",
          "group-has-[:focus-visible]/tip:visible group-has-[:focus-visible]/tip:translate-y-0 group-has-[:focus-visible]/tip:opacity-100",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
        )}
      >
        <span className="block font-semibold">{title}</span>
        {!!hint && <span className="mt-0.5 block font-normal text-muted">{hint}</span>}
      </span>
    </span>
  );
}
