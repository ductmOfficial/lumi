import { useEffect, useRef, useState } from "react";

/** true once the element enters (or nears) the viewport — fires only once. Used to lazy-load rows. */
export function useInView<T extends Element>(rootMargin = "300px", initial = false) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(initial);
  useEffect(() => {
    if (inView || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
    };
  }, [inView, rootMargin]);
  return [ref, inView] as const;
}
