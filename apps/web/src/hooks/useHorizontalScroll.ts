import { useEffect, useRef, type RefObject } from "react";

interface Options {
  /** Turn vertical mouse-wheel scrolling into horizontal scrolling (for small strips: tabs, chips, thumbnails). Default: true */
  wheel?: boolean;
  /** Drag with the mouse to scroll. Default: true */
  drag?: boolean;
}

const DRAG_THRESHOLD = 5;

/**
 * Makes horizontal scrollers usable with a MOUSE (not just trackpad/touch):
 * - vertical wheel → horizontal scroll; at the edge, hand scrolling back to the page
 * - press & drag to scroll; after a drag, the click is blocked (no accidental link opening)
 * Touch is unaffected (pointerType !== 'mouse').
 */
export function useHorizontalScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { wheel = true, drag = true }: Options = {},
) {
  // The element can appear late (conditional render, skeleton → content), so check after EVERY render
  // and only reattach listeners when the element actually changes.
  const attachedRef = useRef<{ el: T; detach: () => void } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (attachedRef.current?.el === el) return;
    attachedRef.current?.detach();
    attachedRef.current = el ? { el, detach: attach(el, wheel, drag) } : null;
  });

  // remove listeners on unmount
  useEffect(
    () => () => {
      attachedRef.current?.detach();
      attachedRef.current = null; // StrictMode mount → unmount → mount: allow reattaching
    },
    [],
  );
}

function attach(el: HTMLElement, wheel: boolean, drag: boolean) {
  const cleanups: (() => void)[] = [];

  if (wheel) {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      // trackpads already scroll horizontally — only handle mostly-vertical scrolling
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      if ((delta < 0 && el.scrollLeft <= 0) || (delta > 0 && el.scrollLeft >= max - 1)) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    cleanups.push(() => {
      el.removeEventListener("wheel", onWheel);
    });
  }

  if (drag) {
    let startX = 0;
    let startScroll = 0;
    let active = false;
    let dragged = false;
    let prevSnap = "";

    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) > DRAG_THRESHOLD) {
        dragged = true;
        prevSnap = el.style.scrollSnapType;
        el.style.scrollSnapType = "none"; // disable snapping while dragging for smoothness
        el.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      if (dragged) el.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (!active) return;
      active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (dragged) {
        el.style.scrollSnapType = prevSnap;
        el.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if (el.scrollWidth - el.clientWidth <= 1) return;
      active = true;
      dragged = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
    // dragged → cancel the click that ends the drag
    const onClick = (e: MouseEvent) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      }
    };
    // block the browser's default image/link drag (it breaks dragging)
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", onDragStart);
    cleanups.push(() => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("dragstart", onDragStart);
      onUp();
    });
  }

  return () => {
    cleanups.forEach((fn) => {
      fn();
    });
  };
}
