import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Facebook-style sticky sidebar: if the sidebar is taller than the viewport, it scrolls with the page
 * until it reaches the viewport BOTTOM, then sticks (negative top) — so all of its content stays reachable.
 * If it is shorter than the viewport, it sticks at `offsetTop` as usual.
 */
export function useStickySidebar<T extends HTMLElement>(offsetTop: number, bottomGap = 16) {
  const ref = useRef<T>(null);
  const [top, setTop] = useState(offsetTop);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setTop(Math.min(offsetTop, window.innerHeight - el.offsetHeight - bottomGap));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [offsetTop, bottomGap]);

  const style: CSSProperties = { top };
  return [ref, style] as const;
}
