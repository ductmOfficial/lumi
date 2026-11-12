import { useEffect, useRef } from "react";
import { useT } from "@/i18n/useT";

interface LoadMoreProps {
  hasNextPage: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
  /** number of items shown — client-side paging has no "loading" state, so this number is used to re-observe after each batch */
  loadedCount?: number;
}

/**
 * Infinite scroll: an invisible sentinel at the end of the list loads more when it is ~600px from the viewport.
 * Works for both API paging (TanStack infinite query) and client-side paging (increasing the visible count).
 */
export function LoadMore({
  hasNextPage,
  isFetchingNextPage = false,
  fetchNextPage,
  loadedCount,
}: LoadMoreProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const fetchRef = useRef(fetchNextPage);
  useEffect(() => {
    fetchRef.current = fetchNextPage;
  });

  // the observer is recreated after each batch → if the sentinel is still in range (short content), keep loading
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchRef.current();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, loadedCount]);

  if (!hasNextPage) return null;
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="flex h-16 items-center justify-center"
    >
      {isFetchingNextPage && (
        <span className="flex items-center gap-1.5" aria-label={t("common.loading")}>
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="size-2 animate-bounce rounded-full bg-muted"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}
