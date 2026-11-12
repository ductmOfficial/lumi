import type { SubmitEvent } from "react";
import { useSearchInput } from "@/features/search/useSearchInput";
import { Link, NavLink, useLocation } from "react-router";
import clsx from "clsx";
import { APP_NAME } from "@/config/env";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { useResolvedTheme } from "@/themes/useResolvedTheme";
import { oppositeTheme } from "@/themes/registry";
import { LanguageToggle } from "@/components/LanguageSwitch";
import { MoonIcon, SearchIcon, SettingsIcon, SunIcon } from "@/components/icons";

function HeaderSearch() {
  const t = useT();
  const { pathname } = useLocation();
  // same source as the /search page input → both inputs always match
  const { input: q, setInput: setQ, submit } = useSearchInput(pathname === "/search");

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  return (
    <form onSubmit={onSubmit} role="search" className="relative hidden w-full max-w-xs lg:block">
      <SearchIcon
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
        }}
        placeholder={t("search.placeholder")}
        aria-label={t("nav.search")}
        className="w-full rounded-full border border-border bg-surface py-1.5 pl-9 pr-4 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </form>
  );
}

/** Quick light/dark toggle (more options in Settings). */
function ThemeToggle() {
  const t = useT();
  const resolved = useResolvedTheme();
  const setTheme = usePreferences((s) => s.setTheme);
  // toggle light/dark while keeping the theme family (e.g. Liquid Glass light ⇄ dark)
  const next = oppositeTheme(resolved);
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
      }}
      aria-label={t("settings.theme")}
      title={t("settings.theme")}
      className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg"
    >
      {resolved.scheme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  );
}

export function Header() {
  const t = useT();
  const { pathname } = useLocation();
  // Detail pages /movie/* belong to Movies, /tv/* to Series
  const section = pathname.startsWith("/movie")
    ? "/movies"
    : pathname.startsWith("/tv/") || pathname.startsWith("/series")
      ? "/series"
      : null;
  const navClass = ({ isActive }: { isActive: boolean }) =>
    clsx("text-sm font-medium transition", isActive ? "text-fg" : "text-muted hover:text-fg");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div
        data-glass-bar="header"
        className="mx-auto flex h-14 max-w-app items-center gap-6 px-4 sm:px-6"
      >
        <Link to="/" className="shrink-0 text-lg font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-accent-2 to-accent bg-clip-text text-transparent">
            {APP_NAME}
          </span>
        </Link>
        <nav className="hidden items-center gap-4 sm:flex lg:gap-5">
          <NavLink to="/" end className={navClass}>
            {t("nav.home")}
          </NavLink>
          <NavLink
            to="/movies"
            className={({ isActive }) => navClass({ isActive: isActive || section === "/movies" })}
          >
            {t("nav.movies")}
          </NavLink>
          <NavLink
            to="/series"
            className={({ isActive }) => navClass({ isActive: isActive || section === "/series" })}
          >
            {t("nav.series")}
          </NavLink>
          <NavLink to="/discover" className={navClass}>
            {t("nav.discover")}
          </NavLink>
          <NavLink to="/watchlist" className={navClass}>
            {t("nav.watchlist")}
          </NavLink>
        </nav>
        <div className="ml-auto flex flex-1 items-center justify-end gap-1 sm:gap-2">
          <HeaderSearch />
          <Link
            to="/search"
            aria-label={t("nav.search")}
            className="rounded-full p-2 text-muted hover:text-fg lg:hidden"
          >
            <SearchIcon size={20} />
          </Link>
          <LanguageToggle />
          <ThemeToggle />
          <NavLink
            to="/settings"
            aria-label={t("nav.settings")}
            title={t("nav.settings")}
            className={({ isActive }) =>
              clsx(
                "inline-flex rounded-full p-2 hover:bg-surface-2",
                isActive ? "text-fg" : "text-muted hover:text-fg",
              )
            }
          >
            <SettingsIcon size={20} />
          </NavLink>
        </div>
      </div>
    </header>
  );
}
