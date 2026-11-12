import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { CloseIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 'auto': bottom sheet on mobile, centered dialog from sm up. 'bottom': always a bottom sheet */
  variant?: "auto" | "bottom";
  size?: "md" | "lg";
  /** drop content padding (e.g. a preview with a full-bleed image) */
  flush?: boolean;
}

let openCount = 0;

/** Shared bottom sheet / dialog: Esc closes, page scroll is locked, focus moves into the sheet. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "auto",
  size = "md",
  flush,
}: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    openCount++;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openCount--;
      if (openCount === 0) document.body.style.overflow = "";
      prevFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const centered = variant === "auto";
  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-[60] flex justify-center",
        centered ? "items-end sm:items-center sm:p-6" : "items-end",
      )}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={clsx(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden bg-surface text-fg shadow-card outline-none",
          "animate-sheet-up rounded-t-2xl pb-safe",
          centered && "sm:animate-fade-in sm:rounded-2xl sm:pb-0",
          size === "lg" ? "sm:max-w-3xl" : "sm:max-w-lg",
          !centered && "sm:max-w-lg sm:rounded-t-2xl",
        )}
      >
        <div
          className={clsx(
            "mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border",
            centered && "sm:hidden",
          )}
        />
        {!!title && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
            <h2 id={titleId} className="text-base font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Close"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        )}
        <div className={clsx("min-h-0 flex-1 overflow-y-auto overscroll-contain", !flush && "p-5")}>
          {children}
        </div>
        {!!footer && <div className="shrink-0 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
