import { useRef, useState, type ReactNode } from "react";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { NavLink } from "react-router";
import clsx from "clsx";
import { tmdbImage } from "@/lib/tmdb";
import { useT } from "@/i18n/useT";
import { ImageIcon, UserIcon } from "@/components/icons";

export interface ProfileTab {
  /** path relative to the profile page; '' = default tab */
  to: string;
  label: string;
  count?: number;
  /** false: stays active on child routes too (e.g. /seasons/2) */
  end?: boolean;
}

interface ProfileLayoutProps {
  /** backdrops used as the cover image (with a change-cover button) */
  covers: string[];
  avatar: { path: string | null | undefined; alt: string; shape: "poster" | "circle" };
  title: ReactNode;
  /** small line right under the name (year · runtime · genres / profession) */
  subtitle?: ReactNode;
  /** stats line like "1.2K friends" */
  stats?: ReactNode;
  /** status badge next to the name (e.g. airing) */
  badge?: ReactNode;
  actions?: ReactNode;
  tabs: ProfileTab[];
  children: ReactNode;
}

/**
 * Facebook-style profile frame shared by movies / series / people:
 * cover image + avatar overlapping its edge, name, stats, action buttons, sticky tab bar.
 */
export function ProfileLayout({
  covers,
  avatar,
  title,
  subtitle,
  stats,
  badge,
  actions,
  tabs,
  children,
}: ProfileLayoutProps) {
  const t = useT();
  const [coverIndex, setCoverIndex] = useState(0);
  const tabsRef = useRef<HTMLUListElement>(null);
  useHorizontalScroll(tabsRef);
  const cover = covers[coverIndex % Math.max(1, covers.length)];

  return (
    <div>
      <div data-glass="flat" className="border-b border-border bg-surface">
        <div className="mx-auto max-w-profile">
          {/* Cover image */}
          <div
            data-profile-cover
            className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden bg-surface-2 sm:aspect-[21/8] lg:rounded-b-xl"
          >
            {cover && (
              <img
                key={cover}
                src={tmdbImage(cover, "w1280")}
                srcSet={`${tmdbImage(cover, "w780")} 780w, ${tmdbImage(cover, "w1280")} 1280w`}
                sizes="(min-width: 1152px) 1152px, 100vw"
                alt=""
                fetchPriority="high"
                className="h-full w-full animate-fade-in object-cover"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
            {covers.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setCoverIndex((i) => (i + 1) % covers.length);
                }}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/70"
              >
                <ImageIcon size={15} />
                <span className="hidden sm:inline">{t("profile.changeCover")}</span>
                <span className="tabular-nums">
                  {(coverIndex % covers.length) + 1}/{covers.length}
                </span>
              </button>
            )}
          </div>

          {/* Avatar + name + actions */}
          <div className="px-4 pb-4 lg:px-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-end lg:flex-nowrap">
              <div
                className={clsx(
                  "relative z-10 shrink-0 overflow-hidden border-4 border-surface bg-surface-2 shadow-card",
                  avatar.shape === "circle"
                    ? "-mt-16 h-32 w-32 rounded-full sm:-mt-20 sm:h-40 sm:w-40"
                    : "-mt-24 aspect-[2/3] w-32 rounded-xl sm:-mt-28 sm:w-40 lg:w-44",
                )}
              >
                {avatar.path ? (
                  <img
                    src={tmdbImage(avatar.path, avatar.shape === "circle" ? "h632" : "w342")}
                    alt={avatar.alt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted">
                    <UserIcon size={48} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-center sm:min-w-[16rem] sm:pt-5 sm:pb-2 sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
                  {badge}
                </div>
                {!!subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
                {!!stats && <div className="mt-1.5 text-sm font-semibold">{stats}</div>}
              </div>
              {/* tablet: actions wrap to their own line so the name is not squeezed; desktop: same row */}
              {!!actions && (
                <div className="flex w-full justify-center sm:justify-start lg:w-auto lg:pb-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar sticky under the header */}
      <nav className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 border-b border-border bg-surface/95 backdrop-blur">
        <ul
          ref={tabsRef}
          data-glass-bar="tabs"
          className="scrollbar-none mx-auto flex max-w-profile gap-1 overflow-x-auto px-2 lg:px-6"
        >
          {tabs.map((tab) => (
            <li key={tab.to} className="shrink-0">
              <NavLink
                to={tab.to}
                end={tab.end ?? true}
                replace
                preventScrollReset
                className={({ isActive }) =>
                  clsx(
                    "relative flex items-center gap-1.5 px-3 py-3.5 text-sm font-semibold transition",
                    isActive
                      ? "text-accent after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-accent"
                      : "text-muted hover:text-fg",
                  )
                }
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-xs font-normal text-muted">{tab.count}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto max-w-profile px-3 py-4 sm:px-4 lg:px-6 lg:py-6">{children}</div>
    </div>
  );
}
