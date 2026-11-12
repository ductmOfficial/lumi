import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { cancelHideHover, scheduleHideHover, usePreview } from "./store";
import { MoviePreviewContent } from "./MoviePreviewContent";

const WIDTH_SCALE = 1.6;
const MIN_WIDTH = 300;

/**
 * Enlarged card on hover (desktop). Rendered through a portal with position: fixed
 * so the overflow of horizontally scrolling rows cannot clip it.
 */
export function HoverPreview() {
  const hover = usePreview((s) => s.hover);
  const hide = usePreview((s) => s.hideHover);
  const location = useLocation();

  // close on navigation / scroll
  useEffect(() => {
    hide();
  }, [location.pathname, hide]);
  useEffect(() => {
    if (!hover) return;
    const onScroll = () => {
      hide();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [hover, hide]);

  if (!hover) return null;
  const { rect, movie } = hover;
  const width = Math.max(MIN_WIDTH, rect.width * WIDTH_SCALE);
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - 8,
  );
  const top = Math.max(72, rect.top - 24);

  return createPortal(
    <div
      className="fixed z-50 animate-fade-in overflow-hidden rounded-xl border border-border bg-surface shadow-card"
      style={{ left, top, width }}
      onMouseEnter={cancelHideHover}
      onMouseLeave={() => {
        scheduleHideHover(120);
      }}
    >
      <MoviePreviewContent movie={movie} onNavigate={hide} />
    </div>,
    document.body,
  );
}
