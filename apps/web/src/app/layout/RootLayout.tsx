import { Outlet, ScrollRestoration } from "react-router";
import { useEffect } from "react";
import { AuthorCredit } from "@/components/AuthorCredit";
import { LanguageLinks } from "@/components/LanguageSwitch";
import { TmdbAttribution } from "@/components/TmdbAttribution";
import { Toaster } from "@/components/Toaster";
import { ReminderNotifier } from "@/features/library/components/ReminderNotifier";
import { usePreferences } from "@/stores/preferences";
import { HoverPreview } from "@/features/preview/HoverPreview";
import { PreviewSheet } from "@/features/preview/PreviewSheet";
import { BottomTabBar } from "./BottomTabBar";
import { Header } from "./Header";

export function RootLayout() {
  const locale = usePreferences((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border/60 pb-tabbar sm:pb-0">
        <div className="mx-auto flex max-w-app flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:gap-8 sm:px-6">
          <TmdbAttribution />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
            <LanguageLinks />
            <AuthorCredit />
          </div>
        </div>
      </footer>
      <BottomTabBar />
      <HoverPreview />
      <PreviewSheet />
      <Toaster />
      <ReminderNotifier />
      <ScrollRestoration getKey={(location) => location.pathname + location.search} />
    </div>
  );
}
