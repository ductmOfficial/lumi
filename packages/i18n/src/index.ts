export { dictionaries, type MessageKey } from "./dictionaries.js";

export type Locale = "vi" | "en";
export const LOCALES: readonly Locale[] = ["vi", "en"];

/**
 * The interface language for a visitor's preferred language tag ("vi-VN", "en-US"…): Vietnamese
 * for Vietnamese, English for everything else. The app and the Worker use the same rule.
 */
export function localeFor(language: string | null | undefined): Locale {
  return /^\s*vi\b/i.test(language ?? "") ? "vi" : "en";
}
