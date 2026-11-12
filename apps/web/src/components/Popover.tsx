import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

interface PopoverProps {
  /** trigger content; receives the open state to change its style */
  trigger: (open: boolean) => ReactNode;
  triggerClassName?: string;
  triggerLabel: string;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  /** open the popover as soon as it mounts (e.g. just marked as watched → invite a rating) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelClassName?: string;
}

/** Simple popover: click the button to open, click outside / Esc to close. */
export function Popover({
  trigger,
  triggerClassName,
  triggerLabel,
  children,
  align = "start",
  open: openProp,
  onOpenChange,
  panelClassName,
}: PopoverProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpenState(false);
        onOpenChange?.(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenState(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => {
          setOpen(!open);
        }}
        className={triggerClassName}
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={triggerLabel}
          className={clsx(
            "absolute top-full z-40 mt-2 w-max min-w-56 max-w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3 text-left text-sm shadow-2xl animate-fade-in",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children(() => {
            setOpen(false);
          })}
        </div>
      )}
    </div>
  );
}
