import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => {
        mq.removeEventListener("change", cb);
      };
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Device with a real mouse (can hover) — desktop. */
export const useCanHover = () => useMediaQuery("(hover: hover) and (pointer: fine)");
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
