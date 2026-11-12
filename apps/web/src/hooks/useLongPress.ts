import { useRef, type PointerEvent, type MouseEvent } from "react";

/**
 * Long-press (touch) to open the preview. Returns handlers to attach to the element.
 * After a long-press fires, the next click is blocked (no navigation).
 */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      firedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      clear();
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        if ("vibrate" in navigator) navigator.vibrate(10);
        onLongPress();
      }, ms);
    },
    onPointerMove: (e: PointerEvent) => {
      if (!startRef.current) return;
      if (
        Math.abs(e.clientX - startRef.current.x) > 10 ||
        Math.abs(e.clientY - startRef.current.y) > 10
      )
        clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onContextMenu: (e: MouseEvent) => {
      // block the default context menu on long-press on mobile
      if (firedRef.current || timerRef.current) e.preventDefault();
    },
    onClickCapture: (e: MouseEvent) => {
      if (firedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        firedRef.current = false;
      }
    },
  };
}
