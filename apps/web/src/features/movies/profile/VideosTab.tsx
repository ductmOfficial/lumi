import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import { tmdbImage, type Video } from "@/lib/tmdb";
import { formatDate, formatRelative } from "@/lib/format";
import { useT, type TFunction } from "@/i18n/useT";
import type { MessageKey } from "@lumi/i18n";
import { dictionaries } from "@lumi/i18n";
import { usePreferences } from "@/stores/preferences";
import { CheckIcon, LinkIcon, PlayIcon } from "@/components/icons";
import { PlayingBars } from "@/components/PlayingBars";
import { ExpandableText } from "@/components/profile/ExpandableText";
import { TrailerPlayer } from "../components/TrailerPlayer";
import { useMovieProfile } from "./context";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

/** Video type label (Trailer → Trailer, Behind the Scenes → localized…); unknown types keep the TMDB name. */
function typeLabel(type: string, t: TFunction) {
  const key = `videoType.${type}` as MessageKey;
  return key in dictionaries.vi ? t(key) : type;
}

/**
 * Videos tab modeled on YouTube's "watch" page:
 * left column = selected video + details; right column = tabs by type + video list.
 * The current video and tab live in the URL (?v=…&type=…) so they can be shared.
 */
export function VideosTab() {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const { movie, recordVideoPlay } = useMovieProfile();
  const [params, setParams] = useSearchParams();
  const playerRef = useRef<HTMLElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  useHorizontalScroll(chipsRef);

  const videos = useMemo(
    () =>
      movie.videos.results
        .filter((v) => v.site === "YouTube")
        // official videos first, then newest
        .sort(
          (a, b) =>
            Number(b.official) - Number(a.official) || b.published_at.localeCompare(a.published_at),
        ),
    [movie],
  );
  const types = useMemo(() => {
    const order = ["Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes", "Bloopers"];
    return [...new Set(videos.map((v) => v.type))].sort(
      (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99),
    );
  }, [videos]);

  const activeType = params.get("type") ?? "all";
  const selectedKey = params.get("v");
  const selected =
    videos.find((v) => v.key === selectedKey) ??
    videos.find((v) => v.type === "Trailer") ??
    videos[0];
  // ?v= in the URL means the user just picked it → autoplay
  const autoPlay = !!selectedKey && selected?.key === selectedKey;
  // the video that is actually playing (autoplay after picking, or the user pressed play in the frame)
  const [startedKey, setStartedKey] = useState<string | null>(null);
  const isPlaying = autoPlay || startedKey === selected?.key;
  const list = activeType === "all" ? videos : videos.filter((v) => v.type === activeType);

  const update = (patch: { v?: string; type?: string }) => {
    const next = new URLSearchParams(params);
    for (const [k, val] of Object.entries(patch)) {
      if (!val || (k === "type" && val === "all")) next.delete(k);
      else next.set(k, val);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const select = (v: Video) => {
    update({ v: v.key });
    recordVideoPlay();
    // mobile/tablet: the list sits below → scroll up to the player (leaving room for the header + sticky tabs)
    if (window.matchMedia("(max-width: 1023px)").matches)
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!selected) {
    return (
      <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        {t("videos.empty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ---------- left column: current video ---------- */}
      <section
        ref={playerRef}
        className="min-w-0 scroll-mt-[calc(7.5rem+env(safe-area-inset-top))]"
      >
        <div className="overflow-hidden rounded-xl bg-black shadow-card">
          <TrailerPlayer
            key={selected.key}
            video={selected}
            autoPlay={autoPlay}
            onPlay={() => {
              setStartedKey(selected.key);
              recordVideoPlay();
            }}
          />
        </div>
        <h2 className="mt-3 text-lg font-bold leading-snug sm:text-xl">{selected.name}</h2>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-2">
              {movie.poster_path && (
                <img
                  src={tmdbImage(movie.poster_path, "w185")}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-sm font-bold">
                {movie.title}
                {selected.official && (
                  <span
                    title={t("videos.official")}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-bg"
                  >
                    <CheckIcon size={10} strokeWidth={3.5} />
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">{typeLabel(selected.type, t)}</p>
            </div>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${selected.key}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-border"
          >
            <LinkIcon size={16} /> {t("videos.openYoutube")}
          </a>
        </div>

        {/* description box, like YouTube */}
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
          <p className="font-semibold">
            {t("videos.publishedOn", { date: formatDate(selected.published_at, locale) })}
            <span className="font-normal text-muted">
              {" "}
              · {formatRelative(selected.published_at, locale)}
            </span>
            {selected.size ? (
              <span className="font-normal text-muted"> · {selected.size}p</span>
            ) : null}
          </p>
          {movie.overview && (
            <ExpandableText text={movie.overview} lines={3} className="mt-1 text-fg/85" />
          )}
        </div>
      </section>

      {/* ---------- right column: tabs + list ---------- */}
      <aside className="min-w-0 lg:sticky lg:top-[calc(7rem+env(safe-area-inset-top))] lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-hidden">
        <div className="flex h-full flex-col">
          <div
            ref={chipsRef}
            className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 pb-3 sm:mx-0 sm:px-0"
          >
            {["all", ...types].map((ty) => {
              const count =
                ty === "all" ? videos.length : videos.filter((v) => v.type === ty).length;
              return (
                <button
                  type="button"
                  key={ty}
                  onClick={() => {
                    update({ type: ty });
                  }}
                  aria-pressed={activeType === ty}
                  className={clsx(
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                    activeType === ty ? "bg-fg text-bg" : "bg-surface-2 text-fg hover:bg-border",
                  )}
                >
                  {ty === "all" ? t("videos.all") : typeLabel(ty, t)}
                  <span className="ml-1.5 text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          <ul className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {list.map((v) => {
              const active = v.key === selected.key;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => {
                      select(v);
                    }}
                    aria-current={active ? "true" : undefined}
                    className={clsx(
                      "group flex w-full gap-3 rounded-lg p-1 text-left transition",
                      active ? "bg-surface-2" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-black">
                      <img
                        src={`https://i.ytimg.com/vi/${v.key}/mqdefault.jpg`}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {active ? (
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 text-[11px] font-bold uppercase tracking-wide text-white">
                          <PlayingBars paused={!isPlaying} />
                          {t("videos.nowPlaying")}
                        </span>
                      ) : (
                        <span className="absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
                          <PlayIcon size={14} />
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
                        {v.size ? `${v.size}p` : "HD"}
                      </span>
                    </span>
                    <span className="min-w-0 py-0.5">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug">
                        {v.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{typeLabel(v.type, t)}</span>
                      <span className="block text-xs text-muted">
                        {formatRelative(v.published_at, locale)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
