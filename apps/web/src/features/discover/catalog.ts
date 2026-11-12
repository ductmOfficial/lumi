import { tmdbFetch, type MediaType, type Paginated, type QueryParams } from "@/lib/tmdb";
import type { MessageKey } from "@lumi/i18n";
import {
  Biohazard,
  Blocks,
  Bot,
  Castle,
  Clapperboard,
  Compass,
  Drama,
  Film,
  Fingerprint,
  Gem,
  Ghost,
  GraduationCap,
  HeartHandshake,
  Heart,
  Hourglass,
  Landmark,
  Laugh,
  Medal,
  Mic,
  Mountain,
  Music,
  Newspaper,
  Orbit,
  Palette,
  Radiation,
  Rocket,
  ScrollText,
  SearchCheck,
  Shield,
  ShieldHalf,
  Siren,
  Sunset,
  Sword,
  Swords,
  Tent,
  Tv,
  Users,
  Video,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Static discovery catalog: topics (TMDB keywords), languages, decades, genre icons (Lucide stroke icons — consistent across OSes, unlike emoji).
 * Topics are stored as slug + keyword names → keyword ids are looked up via /search/keyword when needed.
 */
export interface Theme {
  slug: string;
  /** exact TMDB keyword names — several names are combined with OR */
  keywords: string[];
  icon: LucideIcon;
  label: MessageKey;
  /** the topic only makes sense for this media type (e.g. cultivation → animated series) */
  media?: MediaType;
  /** extra /discover params per media type */
  extra?: Partial<Record<MediaType, QueryParams>>;
  /** used instead of keywords when none can be resolved */
  fallback?: QueryParams;
}

const kw = (slug: string, keyword: string, icon: LucideIcon, label: MessageKey): Theme => ({
  slug,
  keywords: [keyword],
  icon,
  label,
});

export const THEMES: Theme[] = [
  kw("time-travel", "time travel", Hourglass, "theme.timeTravel"),
  kw("post-apocalyptic", "post-apocalyptic future", Radiation, "theme.postApocalyptic"),
  kw("survival", "survival", Tent, "theme.survival"),
  {
    slug: "cultivation",
    // Cultivation / xianxia: Chinese donghua (Battle Through the Heavens, A Record of a Mortal's Journey to Immortality, Renegade Immortal…)
    keywords: ["xianxia", "cultivation", "immortality cultivation"],
    icon: Mountain,
    label: "theme.cultivation",
    media: "tv",
    extra: { tv: { with_original_language: "zh" }, movie: { with_original_language: "zh" } },
    fallback: { with_genres: 16 },
  },
  kw("true-story", "based on true story", ScrollText, "theme.trueStory"),
  kw("superhero", "superhero", ShieldHalf, "theme.superhero"),
  kw("heist", "heist", Gem, "theme.heist"),
  kw("martial-arts", "martial arts", Swords, "theme.martialArts"),
  kw("ai", "artificial intelligence (a.i.)", Bot, "theme.ai"),
  kw("zombie", "zombie", Biohazard, "theme.zombie"),
  kw("space", "space travel", Rocket, "theme.space"),
  kw("high-school", "high school", GraduationCap, "theme.highSchool"),
  kw("revenge", "revenge", Sword, "theme.revenge"),
  kw("mythology", "mythology", Castle, "theme.mythology"),
];

/** Looks up a topic's keyword ids (exact name matches only) → "id1|id2" or null */
export async function resolveThemeKeywords(
  theme: Theme,
  signal?: AbortSignal,
): Promise<string | null> {
  const ids = await Promise.all(
    theme.keywords.map(async (name) => {
      const res = await tmdbFetch<Paginated<{ id: number; name: string }>>(
        "/search/keyword",
        { query: name },
        signal,
      );
      return res.results.find((k) => k.name.toLowerCase() === name.toLowerCase())?.id;
    }),
  );
  const found = ids.filter((id): id is number => !!id);
  return found.length ? [...new Set(found)].join("|") : null;
}

/** /discover params for a topic and media type, once keywords are resolved */
export function themeParams(
  theme: Theme,
  media: MediaType,
  keywordIds: string | null,
): QueryParams {
  return {
    ...theme.extra?.[media],
    ...(keywordIds ? { with_keywords: keywordIds } : theme.fallback),
  };
}

/** Series status & format (with_status / with_type params of /discover/tv) */
export const TV_STATUS = { airing: "0", ended: "3", canceled: "4" } as const;
export type TvStatus = keyof typeof TV_STATUS;
export const TV_FORMAT = {
  miniseries: "2",
  scripted: "4",
  reality: "3",
  documentary: "0",
} as const;
export type TvFormat = keyof typeof TV_FORMAT;

export const STATUS_LABEL: Record<TvStatus, MessageKey> = {
  airing: "discover.status.airing",
  ended: "discover.status.ended",
  canceled: "discover.status.canceled",
};
export const FORMAT_LABEL: Record<TvFormat, MessageKey> = {
  miniseries: "discover.format.miniseries",
  scripted: "discover.format.scripted",
  reality: "discover.format.reality",
  documentary: "discover.format.documentary",
};

export const themeBySlug = (slug: string | undefined) => THEMES.find((t) => t.slug === slug);

/** Original language (ISO 639-1) + an illustrative flag of a representative country */
export const LANGUAGES: { code: string; flag: string }[] = [
  { code: "vi", flag: "🇻🇳" },
  { code: "ko", flag: "🇰🇷" },
  { code: "ja", flag: "🇯🇵" },
  { code: "zh", flag: "🇨🇳" },
  { code: "th", flag: "🇹🇭" },
  { code: "hi", flag: "🇮🇳" },
  { code: "fr", flag: "🇫🇷" },
  { code: "es", flag: "🇪🇸" },
];

export const isLanguage = (code: string | null | undefined): code is string =>
  !!code && /^[a-z]{2}$/.test(code);

/** Language name in the UI locale, via Intl so nothing needs manual translation */
export function languageName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const DECADES = [2020, 2010, 2000, 1990, 1980, 1970, 1960] as const;
export const isDecade = (n: number | undefined): n is number =>
  n !== undefined && n >= 1900 && n <= 2100 && n % 10 === 0;

/** Date range of a decade */
export const decadeRange = (decade: number) => ({
  gte: `${decade}-01-01`,
  lte: `${decade + 9}-12-31`,
});

/** Illustrative icon for movie & series genres (TMDB ids) */
export const GENRE_ICON: Record<number, LucideIcon> = {
  28: Zap,
  12: Compass,
  16: Palette,
  35: Laugh,
  80: Fingerprint,
  99: Video,
  18: Drama,
  10751: Users,
  14: WandSparkles,
  36: Landmark,
  27: Ghost,
  10402: Music,
  9648: SearchCheck,
  10749: Heart,
  878: Orbit,
  10770: Tv,
  53: Siren,
  10752: Medal,
  37: Sunset,
  // series
  10759: Zap,
  10762: Blocks,
  10763: Newspaper,
  10764: Clapperboard,
  10765: Orbit,
  10766: HeartHandshake,
  10767: Mic,
  10768: Shield,
};
export const genreIcon = (id: number): LucideIcon => GENRE_ICON[id] ?? Film;
