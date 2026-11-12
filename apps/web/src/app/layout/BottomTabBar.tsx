import { NavLink, useLocation } from "react-router";
import clsx from "clsx";
import { useT } from "@/i18n/useT";
import type { MessageKey } from "@lumi/i18n";
import { BookmarkIcon, CompassIcon, FilmIcon, HomeIcon, TvIcon } from "@/components/icons";
import { usePersonalization } from "@/features/personalization/store";

const TABS: { to: string; label: MessageKey; Icon: typeof HomeIcon; end?: boolean }[] = [
  { to: "/", label: "nav.home", Icon: HomeIcon, end: true },
  { to: "/movies", label: "nav.movies", Icon: FilmIcon },
  { to: "/series", label: "nav.series", Icon: TvIcon },
  { to: "/discover", label: "nav.discover", Icon: CompassIcon },
  { to: "/watchlist", label: "nav.watchlist", Icon: BookmarkIcon },
];

/** Bottom tab bar — mobile only (<640px). */
export function BottomTabBar() {
  const t = useT();
  const watchCount = usePersonalization((s) => s.watchlist.length);
  const { pathname } = useLocation();
  const extraActive = (to: string) =>
    (to === "/movies" && pathname.startsWith("/movie/")) ||
    (to === "/series" && pathname.startsWith("/tv/"));
  return (
    <nav
      aria-label="Main"
      data-glass-bar="tabbar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-bg/90 pb-safe backdrop-blur sm:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium",
                  isActive || extraActive(to) ? "text-fg" : "text-muted",
                )
              }
            >
              {({ isActive: active }) => {
                const isActive = active || extraActive(to);
                return (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                    {t(label)}
                    {to === "/watchlist" && watchCount > 0 && (
                      <span className="absolute right-[calc(50%-1.1rem)] top-2 min-w-4 rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-4 text-accent-fg">
                        {watchCount > 99 ? "99+" : watchCount}
                      </span>
                    )}
                  </>
                );
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
