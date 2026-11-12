import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { tmdbImage } from "@/lib/tmdb";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlayIcon } from "@/components/icons";
import type { MediaItem } from "./media";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

interface MediaViewerProps {
  items: MediaItem[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  title?: string;
  /** called when a video plays (to record a personalization signal) */
  onVideoPlay?: () => void;
}

/**
 * Facebook-style full-screen media viewer:
 * stage on the left + list panel on the right (desktop) / thumbnail strip at the bottom (mobile).
 * ←/→ or swipe to move, Esc to close. YouTube videos play right in the stage.
 */
export function MediaViewer({ items, index, onIndexChange, title, onVideoPlay }: MediaViewerProps) {
  const open = index !== null && items.length > 0;
  const current = open ? items[Math.min(index, items.length - 1)] : null;
  const touchXRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  useHorizontalScroll(listRef);
  useHorizontalScroll(chipsRef);
  const go = (d: number) => {
    if (index !== null) onIndexChange((index + d + items.length) % items.length);
  };

  // keyboard shortcuts + page scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndexChange(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  // scroll the selected thumbnail to the middle of the list
  useEffect(() => {
    if (!current) return;
    listRef.current
      ?.querySelector(`[data-id="${CSS.escape(current.id)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [current]);

  // record each move to a video
  const onVideoPlayRef = useRef(onVideoPlay);
  useEffect(() => {
    onVideoPlayRef.current = onVideoPlay;
  });
  const currentId = current?.id;
  const isVideo = current?.type === "video";
  useEffect(() => {
    if (currentId && isVideo) onVideoPlayRef.current?.();
  }, [currentId, isVideo]);

  if (!open || !current) return null;

  const groups = [...new Set(items.map((i) => i.group))];
  const activeGroup = current.group;
  const listItems = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.group === activeGroup);
  const isVideoGroup = listItems[0]?.item.type === "video";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex animate-fade-in flex-col bg-black text-white lg:flex-row"
    >
      {/* ----- stage ----- */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(e) => (touchXRef.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const s = touchXRef.current;
          const end = e.changedTouches[0]?.clientX;
          if (s != null && end != null && Math.abs(end - s) > 50) go(end < s ? 1 : -1);
        }}
      >
        {/* blurred background from the current image itself */}
        {current.type === "image" && (
          <img
            src={tmdbImage(current.path, "w300")}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-3xl"
          />
        )}
        <div className="relative flex h-full w-full items-center justify-center p-3 pt-16 pb-6 sm:p-12">
          {current.type === "image" ? (
            <img
              key={current.id}
              src={tmdbImage(current.path, current.aspect < 1 ? "w780" : "w1280")}
              alt=""
              className="max-h-full max-w-full animate-fade-in rounded-md object-contain shadow-2xl"
            />
          ) : (
            <div
              key={current.id}
              className="aspect-video w-full max-w-[min(100%,calc((100dvh-12rem)*16/9))] overflow-hidden rounded-lg bg-black shadow-2xl"
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${current.video.key}?autoplay=1&rel=0&playsinline=1`}
                title={current.video.name}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                // The player is cross-origin (YouTube), so allow-same-origin only keeps its own origin.
                // eslint-disable-next-line @eslint-react/dom-no-unsafe-iframe-sandbox
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                className="h-full w-full"
              />
            </div>
          )}
        </div>

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => {
              onIndexChange(null);
            }}
            aria-label="Close"
            className="rounded-full bg-white/10 p-2 hover:bg-white/20"
          >
            <CloseIcon />
          </button>
          <div className="min-w-0">
            {title && <p className="truncate text-sm font-bold">{title}</p>}
            <p className="truncate text-xs text-white/70">
              {current.type === "video" ? current.video.name : current.group} · {index + 1}/
              {items.length}
            </p>
          </div>
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                go(-1);
              }}
              aria-label="Previous"
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/25 sm:block"
            >
              <ChevronLeftIcon size={26} />
            </button>
            <button
              type="button"
              onClick={() => {
                go(1);
              }}
              aria-label="Next"
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/25 sm:block"
            >
              <ChevronRightIcon size={26} />
            </button>
          </>
        )}
      </div>

      {/* ----- list panel ----- */}
      <aside className="flex shrink-0 flex-col border-t border-white/10 bg-zinc-950 pb-safe lg:w-[360px] lg:border-l lg:border-t-0">
        {groups.length > 1 && (
          <div
            ref={chipsRef}
            className="scrollbar-none flex gap-2 overflow-x-auto px-3 pt-3 lg:px-4 lg:pt-4"
          >
            {groups.map((g) => {
              const first = items.findIndex((i) => i.group === g);
              const count = items.filter((i) => i.group === g).length;
              return (
                <button
                  type="button"
                  key={g}
                  onClick={() => {
                    onIndexChange(first);
                  }}
                  className={clsx(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition",
                    g === activeGroup
                      ? "bg-white text-black"
                      : "bg-white/10 text-white/80 hover:bg-white/20",
                  )}
                >
                  {g} <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}
        <div
          ref={listRef}
          className={clsx(
            "scrollbar-none flex gap-2 overflow-x-auto p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:p-4",
            isVideoGroup ? "lg:flex-col" : "lg:grid lg:auto-rows-min lg:grid-cols-2",
          )}
        >
          {listItems.map(({ item, i }) => {
            const active = i === index;
            if (item.type === "video") {
              return (
                <button
                  type="button"
                  key={item.id}
                  data-id={item.id}
                  onClick={() => {
                    onIndexChange(i);
                  }}
                  className={clsx(
                    "flex w-56 shrink-0 gap-3 rounded-lg p-1.5 text-left transition lg:w-full",
                    active ? "bg-white/15 ring-2 ring-accent" : "hover:bg-white/10",
                  )}
                >
                  <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded bg-zinc-800">
                    <img
                      src={`https://i.ytimg.com/vi/${item.video.key}/mqdefault.jpg`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 m-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/60">
                      <PlayIcon size={12} />
                    </span>
                  </span>
                  <span className="min-w-0 py-0.5">
                    <span className="line-clamp-2 text-xs font-semibold">{item.video.name}</span>
                    <span className="mt-0.5 block text-[11px] text-white/60">
                      {item.video.type}
                    </span>
                  </span>
                </button>
              );
            }
            return (
              <button
                type="button"
                key={item.id}
                data-id={item.id}
                onClick={() => {
                  onIndexChange(i);
                }}
                aria-label={`${item.group} ${i + 1}`}
                className={clsx(
                  "shrink-0 overflow-hidden rounded-md bg-zinc-800 transition",
                  item.aspect < 1 ? "aspect-[2/3] h-20 lg:h-auto" : "aspect-video h-20 lg:h-auto",
                  active
                    ? "ring-2 ring-accent ring-offset-2 ring-offset-zinc-950"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <img
                  src={tmdbImage(item.path, item.aspect < 1 ? "w342" : "w780")}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
