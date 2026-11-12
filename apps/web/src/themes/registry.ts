/**
 * Theme list. To add a theme:
 *  1. create src/themes/<id>.css with a [data-theme='<id>'] selector defining every variable (see dark.css)
 *  2. @import that file in src/index.css
 *  3. add an entry to THEMES below (and the id to public/theme-init.js if it is a default light/dark theme)
 */
export type ThemeScheme = "light" | "dark";
/** theme family: each family has one light and one dark variant */
export type ThemeFamily = "classic" | "glass";

export interface ThemeDefinition {
  id: string;
  label: { vi: string; en: string };
  scheme: ThemeScheme;
  family: ThemeFamily;
  /** mobile browser bar color (meta theme-color) */
  themeColor: string;
  /** preview.bg may be a CSS gradient */
  preview: { bg: string; surface: string; fg: string; accent: string };
}

export const THEMES = [
  {
    id: "dark",
    label: { vi: "Tối", en: "Dark" },
    scheme: "dark",
    family: "classic",
    themeColor: "#0b0f17",
    preview: { bg: "#0b0f17", surface: "#141a26", fg: "#e6e9ef", accent: "#01b4e4" },
  },
  {
    id: "light",
    label: { vi: "Sáng", en: "Light" },
    scheme: "light",
    family: "classic",
    themeColor: "#f5f6f8",
    preview: { bg: "#f5f6f8", surface: "#ffffff", fg: "#0d1626", accent: "#0279b8" },
  },
  {
    id: "glass-light",
    label: { vi: "Liquid Glass · Sáng", en: "Liquid Glass · Light" },
    scheme: "light",
    family: "glass",
    themeColor: "#eef1f7",
    preview: {
      bg: "radial-gradient(at 15% 15%, #b9cdff 0, transparent 55%), radial-gradient(at 85% 20%, #ffc9e0 0, transparent 50%), radial-gradient(at 60% 95%, #bdf0dc 0, transparent 55%), #eef1f7",
      surface: "rgb(255 255 255 / 0.55)",
      fg: "#0d1626",
      accent: "#0066d6",
    },
  },
  {
    id: "glass-dark",
    label: { vi: "Liquid Glass · Tối", en: "Liquid Glass · Dark" },
    scheme: "dark",
    family: "glass",
    themeColor: "#080b16",
    preview: {
      bg: "radial-gradient(at 15% 15%, #2a3f9e 0, transparent 55%), radial-gradient(at 85% 25%, #6b2a7f 0, transparent 50%), radial-gradient(at 60% 95%, #0f5f5a 0, transparent 55%), #080b16",
      surface: "rgb(255 255 255 / 0.08)",
      fg: "#eef1f6",
      accent: "#4aa3ff",
    },
  },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = (typeof THEMES)[number]["id"];
/** 'system' / 'glass-system' = follow the OS light/dark setting within the matching family */
export type SystemPreference = "system" | "glass-system";
export type ThemePreference = SystemPreference | ThemeId;

export const THEME_BY_FAMILY: Record<ThemeFamily, Record<ThemeScheme, ThemeId>> = {
  classic: { dark: "dark", light: "light" },
  glass: { dark: "glass-dark", light: "glass-light" },
};
const SYSTEM_FAMILY: Record<SystemPreference, ThemeFamily> = {
  system: "classic",
  "glass-system": "glass",
};

export function getTheme(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ThemeDefinition {
  if (pref in SYSTEM_FAMILY) {
    const family = SYSTEM_FAMILY[pref as SystemPreference];
    return getTheme(THEME_BY_FAMILY[family][systemPrefersDark ? "dark" : "light"]);
  }
  return getTheme(pref);
}

/** Same-family theme with the opposite light/dark (quick toggle in the header) */
export function oppositeTheme(theme: ThemeDefinition): ThemeId {
  return THEME_BY_FAMILY[theme.family][theme.scheme === "dark" ? "light" : "dark"];
}
