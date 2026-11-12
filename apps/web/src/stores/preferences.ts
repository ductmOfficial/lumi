import { omitKey } from "@/lib/record";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemePreference } from "@/themes/registry";

import type { Locale } from "@lumi/i18n";

export type { Locale };

/** The streaming service the user watches on, picked from TMDB's providers for their region. */
export interface StreamingService {
  /** TMDB / JustWatch provider_id */
  id: number;
  name: string;
}

interface PreferencesState {
  locale: Locale;
  region: string;
  theme: ThemePreference;
  setLocale: (locale: Locale) => void;
  setRegion: (region: string) => void;
  setTheme: (theme: ThemePreference) => void;
  /** null = none picked: no "new on your service" row */
  streamingService: StreamingService | null;
  setStreamingService: (service: StreamingService | null) => void;
  /** row layouts chosen by the user, keyed by row id (e.g. "genre-878") */
  rowLayouts: Record<string, RowLayoutChoice>;
  /** null = back to the row's default layout */
  setRowLayout: (rowId: string, layout: RowLayoutChoice | null) => void;
  resetRowLayouts: () => void;
}

/** list: regular horizontal row · spotlight: video frame + list */
export type RowLayoutChoice = "list" | "spotlight";

/** localStorage key — public/theme-init.js reads this key too. */
export const PREFERENCES_STORAGE_KEY = "lumi:preferences";

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: "vi",
      region: "VN",
      theme: "system",
      setLocale: (locale) => set({ locale }),
      setRegion: (region) => set({ region }),
      setTheme: (theme) => set({ theme }),
      streamingService: null,
      setStreamingService: (streamingService) => set({ streamingService }),
      rowLayouts: {},
      setRowLayout: (rowId, layout) =>
        set((s) => {
          const next = layout ? { ...s.rowLayouts, [rowId]: layout } : omitKey(s.rowLayouts, rowId);
          return { rowLayouts: next };
        }),
      resetRowLayouts: () => set({ rowLayouts: {} }),
    }),
    { name: PREFERENCES_STORAGE_KEY },
  ),
);

const TMDB_LANGUAGE: Record<Locale, string> = { vi: "vi-VN", en: "en-US" };

/** language + region used for every TMDB request; part of the query key so the cache is split per language. */
export function useTmdbLocale() {
  const locale = usePreferences((s) => s.locale);
  const region = usePreferences((s) => s.region);
  return { locale, language: TMDB_LANGUAGE[locale], region };
}
