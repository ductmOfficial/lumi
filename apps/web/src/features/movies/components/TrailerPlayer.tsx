import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { Video } from "@/lib/tmdb";
import { useT } from "@/i18n/useT";
import { ArrowUpIcon, CloseIcon, PlayIcon } from "@/components/icons";

/**
 * Only one inline video plays at a time: starting a new one pauses the others.
 * The value is called when another video "takes over" the player (to leave the mini player).
 */
const players = new Map<HTMLIFrameElement, () => void>();

/** Sends a command to the YouTube IFrame API (requires enablejsapi=1). */
function command(iframe: HTMLIFrameElement | null, func: "pauseVideo" | "playVideo") {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
}

/**
 * position: fixed only follows the viewport when no ancestor creates a new containing block
 * (transform, filter, contain…). If one does → it cannot float, so fall back to pausing.
 */
function canFloat(el: HTMLElement) {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (
      s.transform !== "none" ||
      s.filter !== "none" ||
      s.backdropFilter !== "none" ||
      s.perspective !== "none" ||
      /paint|layout|strict|content/.test(s.contain) ||
      /transform|filter/.test(s.willChange)
    )
      return false;
  }
  return true;
}

interface TrailerPlayerProps {
  video: Video;
  autoPlay?: boolean;
  onPlay?: () => void;
  /**
   * When the playing video scrolls off screen:
   * - 'mini' (default): switch to the mini player in the bottom-right corner and keep playing
   * - 'pause': pause
   */
  whenHidden?: "mini" | "pause";
}

/** Only loads the YouTube iframe on click — lighter pages and no unnecessary cookies. */
export function TrailerPlayer({
  video,
  autoPlay,
  onPlay,
  whenHidden = "mini",
}: TrailerPlayerProps) {
  const t = useT();
  const [playing, setPlaying] = useState(!!autoPlay);
  const [mini, setMini] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // the user closed the mini player → do not reopen it until the video is back on screen
  const dismissedRef = useRef(false);

  // register the playing player; stop the others (and take back their mini player)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!playing || !iframe) return;
    for (const [other, preempt] of players) {
      if (other === iframe) continue;
      command(other, "pauseVideo");
      preempt();
    }
    players.set(iframe, () => {
      dismissedRef.current = true;
      setMini(false);
    });
    return () => {
      players.delete(iframe);
    };
  }, [playing]);

  // scrolled off screen (< 30% visible) → mini player (or pause); back on screen → return to its place
  useEffect(() => {
    const el = wrapRef.current;
    if (!playing || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= 0.3) {
          dismissedRef.current = false;
          setMini(false);
        } else if (!dismissedRef.current) {
          if (whenHidden === "mini" && canFloat(el)) setMini(true);
          else command(iframeRef.current, "pauseVideo");
        }
      },
      { threshold: [0, 0.3] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [playing, whenHidden]);

  const closeMini = () => {
    dismissedRef.current = true;
    command(iframeRef.current, "pauseVideo");
    setMini(false);
  };
  const backToVideo = () =>
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div ref={wrapRef} className="relative aspect-video overflow-hidden bg-black">
      {playing ? (
        <>
          {/* placeholder keeps the layout while the video floats in the corner */}
          {mini && (
            <button
              type="button"
              onClick={backToVideo}
              className="group absolute inset-0 text-white"
            >
              <img
                src={`https://i.ytimg.com/vi/${video.key}/hqdefault.jpg`}
                alt=""
                className="h-full w-full object-cover opacity-30"
              />
              <span className="absolute inset-0 grid place-items-center p-4 text-center text-sm font-semibold">
                {t("player.inMini")}
              </span>
            </button>
          )}
          {/* the iframe never changes parent (that would reload the video) — only the container's display mode changes */}
          <div
            className={clsx(
              mini
                ? "fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl sm:right-5 sm:bottom-5 sm:w-[22rem] motion-safe:animate-[mini-in_.2s_ease-out]"
                : "absolute inset-0",
            )}
            role={mini ? "region" : undefined}
            aria-label={mini ? video.name : undefined}
          >
            {mini && (
              <div className="flex items-center gap-1 py-1 pl-3 pr-1">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold">{video.name}</p>
                <button
                  type="button"
                  onClick={backToVideo}
                  aria-label={t("player.back")}
                  title={t("player.back")}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <ArrowUpIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={closeMini}
                  aria-label={t("player.close")}
                  title={t("player.close")}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
              title={video.name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              // The player is cross-origin (YouTube), so allow-same-origin only keeps its own origin.
              // eslint-disable-next-line @eslint-react/dom-no-unsafe-iframe-sandbox
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
              className={
                mini ? "block aspect-video w-full bg-black" : "absolute inset-0 h-full w-full"
              }
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            onPlay?.();
          }}
          className="group absolute inset-0"
          aria-label={`Play ${video.name}`}
        >
          <img
            src={`https://i.ytimg.com/vi/${video.key}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-85 transition group-hover:opacity-100"
          />
          <span className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white ring-2 ring-white/50 transition group-hover:scale-110">
            <PlayIcon size={24} />
          </span>
        </button>
      )}
    </div>
  );
}
