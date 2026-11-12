import { useEffect } from "react";
import { useResolvedTheme } from "./useResolvedTheme";

/** Syncs the selected theme to <html data-theme> and <meta name="theme-color">. */
export function ThemeController() {
  const theme = useResolvedTheme();
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme.id;
    el.dataset.scheme = theme.scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.themeColor);
  }, [theme]);
  return null;
}
