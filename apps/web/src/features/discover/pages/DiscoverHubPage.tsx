import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { PageMeta } from "@/components/PageMeta";
import { MovieRow } from "@/components/MovieRow";
import { Segmented } from "@/components/Segmented";
import { FilterIcon, SparklesIcon } from "@/components/icons";
import { HIGHLIGHT_TONES, toneFor } from "@/components/profile/highlightTones";
import {
  normalizeTvPage,
  tmdbFetch,
  tmdbImage,
  type MediaType,
  type MovieSummary,
  type Paginated,
  type RawTvSummary,
} from "@/lib/tmdb";
import { movieHref, personHref } from "@/lib/slug";
import { useT } from "@/i18n/useT";
import { usePreferences, useTmdbLocale } from "@/stores/preferences";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useGenres, useWatchProviders } from "../api/queries";
import {
  CircleCheckBig,
  Clapperboard,
  Dices,
  Gamepad2,
  Gem,
  Scale,
  UsersRound,
  Flower2,
  Heart,
  Mountain,
  RadioTower,
  Tent,
  type LucideIcon,
} from "lucide-react";
import { DECADES, LANGUAGES, THEMES, genreIcon, languageName } from "../catalog";
import { FollowTopicButton } from "@/features/personalization/components/FollowTopicButton";
import { SpotlightRow } from "@/features/personalization/components/SpotlightRow";
import { LayoutToggle } from "@/components/LayoutToggle";
import type { MessageKey } from "@lumi/i18n";

/** Calls /discover for movies or series and returns the shared MovieSummary shape */
function discover(
  media: MediaType,
  params: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
) {
  return media === "tv"
    ? tmdbFetch<Paginated<RawTvSummary>>("/discover/tv", params, signal).then(normalizeTvPage)
    : tmdbFetch<Paginated<MovieSummary>>("/discover/movie", params, signal);
}

/** Link to the Browse page with matching filters, keeping the movie/series type */
/** Placeholder keys while the people strip loads */
const PEOPLE_SKELETON = Array.from({ length: 8 }, (_, i) => `person-skeleton-${i}`);

const browseHref = (media: MediaType, params: Record<string, string | number>) => {
  const sp = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  if (media === "tv") sp.set("type", "tv");
  return `/discover/browse?${sp}`;
};

function Section({
  title,
  children,
  aside,
}: {
  title: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** "Surprise me" button: picks a highly rated title from a random page and opens it */
function SurpriseMe({ media }: { media: MediaType }) {
  const t = useT();
  const navigate = useNavigate();
  const { language } = useTmdbLocale();
  const [busy, setBusy] = useState(false);

  const roll = async () => {
    setBusy(true);
    try {
      const params = {
        language,
        include_adult: false,
        sort_by: "popularity.desc",
        "vote_average.gte": 7.2,
        "vote_count.gte": media === "tv" ? 300 : 800,
      };
      const page = 1 + Math.floor(Math.random() * 15);
      let res = await discover(media, { ...params, page });
      if (!res.results.length) res = await discover(media, { ...params, page: 1 });
      const pick = res.results[Math.floor(Math.random() * res.results.length)];
      if (pick) void navigate(movieHref(pick));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={roll}
      disabled={busy}
      className={clsx(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left text-white shadow-card transition hover:brightness-110 disabled:cursor-wait sm:p-6",
        HIGHLIGHT_TONES.violet,
      )}
    >
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm sm:size-14"
      >
        <Dices
          className={clsx(
            "size-7 transition sm:size-8",
            busy ? "animate-spin" : "group-hover:rotate-12",
          )}
          strokeWidth={1.75}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-extrabold sm:text-xl">
          {busy ? t("hub.surpriseLoading") : t("hub.surprise")}
        </span>
        <span className="block text-sm text-white/80">{t("hub.surpriseHint")}</span>
      </span>
      <SparklesIcon
        size={96}
        className="pointer-events-none absolute -right-4 -top-4 text-white/10"
      />
    </button>
  );
}

/**
 * Icon for gradient tiles: a white stroke icon in a small glass block (top-right) + a faded enlarged copy as a background pattern.
 * Uses Lucide icons instead of emoji so strokes/colors are consistent across OSes.
 */
function TileIcon({ icon: Icon, size = "md" }: { icon: LucideIcon; size?: "md" | "lg" }) {
  return (
    <>
      <Icon
        aria-hidden
        strokeWidth={1.25}
        className={clsx(
          "pointer-events-none absolute -rotate-12 text-white/15",
          size === "lg" ? "-bottom-5 -right-4 size-28" : "-bottom-4 -right-3 size-20 sm:size-24",
        )}
      />
      <span
        aria-hidden
        className={clsx(
          "absolute grid place-items-center rounded-lg bg-white/20 ring-1 ring-white/25 backdrop-blur-sm",
          size === "lg" ? "right-3 top-3 size-10" : "right-2 top-2 size-7 sm:size-8",
        )}
      >
        <Icon className={size === "lg" ? "size-5" : "size-4"} strokeWidth={2} />
      </span>
    </>
  );
}

/** Entry points to the interactive features: mini-game, group picker, compare */
function ToolTiles() {
  const t = useT();
  const tools: {
    to: string;
    icon: LucideIcon;
    title: MessageKey;
    hint: MessageKey;
    tone: keyof typeof HIGHLIGHT_TONES;
  }[] = [
    { to: "/play", icon: Gamepad2, title: "tools.play", hint: "tools.playHint", tone: "ocean" },
    {
      to: "/together",
      icon: UsersRound,
      title: "tools.together",
      hint: "tools.togetherHint",
      tone: "berry",
    },
    {
      to: "/compare",
      icon: Scale,
      title: "tools.compare",
      hint: "tools.compareHint",
      tone: "forest",
    },
  ];
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      {tools.map((x) => (
        <li key={x.to}>
          <Link
            to={x.to}
            className={clsx(
              "relative flex h-24 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-card transition hover:-translate-y-0.5 hover:brightness-110 sm:h-28",
              HIGHLIGHT_TONES[x.tone],
            )}
          >
            <TileIcon icon={x.icon} size="lg" />
            <span className="relative text-base font-extrabold leading-tight drop-shadow">
              {t(x.title)}
            </span>
            <span className="relative text-xs text-white/85">{t(x.hint)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GenreTiles({ media }: { media: MediaType }) {
  const genres = useGenres(media);
  return (
    <ul className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
      {(genres.data ?? Array.from({ length: 12 }, (_, i) => ({ id: -i, name: "" }))).map((g) => (
        <li key={g.id}>
          {g.id < 0 ? (
            <div className="h-16 animate-pulse rounded-xl bg-surface-2 sm:h-20" />
          ) : (
            <Link
              to={browseHref(media, { genres: g.id })}
              className={clsx(
                "relative flex h-16 items-end overflow-hidden rounded-xl bg-gradient-to-br p-2.5 text-xs font-bold sm:h-20 sm:p-3 sm:text-sm text-white shadow-card transition hover:-translate-y-0.5 hover:brightness-110",
                HIGHLIGHT_TONES[toneFor(g.id)],
              )}
            >
              <span className="relative z-10 leading-tight drop-shadow">{g.name}</span>
              <TileIcon icon={genreIcon(g.id)} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function ThemeTiles({ media }: { media: MediaType }) {
  const t = useT();
  return (
    <ul className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {THEMES.map((th) => (
        <li
          key={th.slug}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface pr-2.5 transition hover:border-fg"
        >
          <Link
            to={browseHref(th.media ?? media, { theme: th.slug })}
            className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-sm font-semibold"
          >
            <span
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"
              aria-hidden
            >
              <th.icon className="size-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 leading-tight">{t(th.label)}</span>
          </Link>
          <FollowTopicButton slug={th.slug} size="sm" />
        </li>
      ))}
    </ul>
  );
}

/** Series shelf: shortcuts to popular series groups (short, completed, cultivation, survival…) */
const SHELVES: {
  key: string;
  icon: LucideIcon;
  label: MessageKey;
  hint: MessageKey;
  to: string;
  tone: keyof typeof HIGHLIGHT_TONES;
}[] = [
  {
    key: "short",
    icon: Clapperboard,
    label: "hub.shelf.short",
    hint: "hub.shelf.shortHint",
    to: browseHref("tv", { format: "miniseries", rating: 7 }),
    tone: "sunset",
  },
  {
    key: "completed",
    icon: CircleCheckBig,
    label: "hub.shelf.completed",
    hint: "hub.shelf.completedHint",
    to: browseHref("tv", { status: "ended", rating: 7 }),
    tone: "forest",
  },
  {
    key: "airing",
    icon: RadioTower,
    label: "hub.shelf.airing",
    hint: "hub.shelf.airingHint",
    to: "/series/on_the_air",
    tone: "ocean",
  },
  {
    key: "cultivation",
    icon: Mountain,
    label: "hub.shelf.cultivation",
    hint: "hub.shelf.cultivationHint",
    to: browseHref("tv", { theme: "cultivation" }),
    tone: "gold",
  },
  {
    key: "survival",
    icon: Tent,
    label: "hub.shelf.survival",
    hint: "hub.shelf.survivalHint",
    to: browseHref("tv", { theme: "survival" }),
    tone: "berry",
  },
  {
    key: "anime",
    icon: Flower2,
    label: "hub.shelf.anime",
    hint: "hub.shelf.animeHint",
    to: browseHref("tv", { lang: "ja", genres: 16 }),
    tone: "violet",
  },
  {
    key: "kdrama",
    icon: Heart,
    label: "hub.shelf.kdrama",
    hint: "hub.shelf.kdramaHint",
    to: browseHref("tv", { lang: "ko", genres: 18 }),
    tone: "night",
  },
];

function SeriesShelves() {
  const t = useT();
  return (
    <Strip>
      {SHELVES.map((sh) => (
        <li key={sh.key} className="shrink-0">
          <Link
            to={sh.to}
            className={clsx(
              "relative flex h-28 w-40 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white shadow-card transition hover:-translate-y-0.5 hover:brightness-110 sm:w-48",
              HIGHLIGHT_TONES[sh.tone],
            )}
          >
            <TileIcon icon={sh.icon} size="lg" />
            <span className="text-base font-extrabold leading-tight drop-shadow">
              {t(sh.label)}
            </span>
            <span className="text-xs text-white/80">{t(sh.hint)}</span>
          </Link>
        </li>
      ))}
    </Strip>
  );
}

function Strip({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  useHorizontalScroll(ref);
  return (
    <ul
      ref={ref}
      className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 pb-1"
    >
      {children}
    </ul>
  );
}

function LanguagePills({ media }: { media: MediaType }) {
  const locale = usePreferences((s) => s.locale);
  return (
    <Strip>
      {LANGUAGES.map((l) => (
        <li key={l.code} className="shrink-0">
          <Link
            to={browseHref(media, { lang: l.code })}
            className="flex items-center gap-2 rounded-full border border-border bg-surface py-2 pl-2.5 pr-4 text-sm font-medium capitalize transition hover:border-fg"
          >
            <span className="text-xl" aria-hidden>
              {l.flag}
            </span>
            {languageName(l.code, locale)}
          </Link>
        </li>
      ))}
    </Strip>
  );
}

function DecadeTiles({ media }: { media: MediaType }) {
  const t = useT();
  return (
    <Strip>
      {DECADES.map((d, i) => (
        <li key={d} className="shrink-0">
          <Link
            to={browseHref(media, { decade: d })}
            aria-label={t("discover.decadeLabel", { n: d })}
            className="flex h-20 w-28 flex-col justify-center rounded-xl border border-border bg-surface px-4 transition hover:border-fg sm:w-32"
            // older decades fade out like old film stock
            style={{ filter: `sepia(${Math.min(i * 0.12, 0.7)})` }}
          >
            <span className="text-2xl font-black tracking-tight">{String(d).slice(2)}s</span>
            <span className="text-xs text-muted">
              {d}–{d + 9}
            </span>
          </Link>
        </li>
      ))}
    </Strip>
  );
}

function ProviderLogos({ media }: { media: MediaType }) {
  const providers = useWatchProviders(media);
  const list = providers.data?.filter((p) => p.logo_path).slice(0, 12);
  if (providers.isSuccess && !list?.length) return null;
  return (
    <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
      {list
        ? list.map((p) => (
            <li key={p.provider_id}>
              <Link
                to={browseHref(media, { provider: p.provider_id })}
                title={p.provider_name}
                className="block transition hover:-translate-y-0.5"
              >
                <img
                  src={tmdbImage(p.logo_path, "w92")}
                  alt={p.provider_name}
                  loading="lazy"
                  className="aspect-square w-full rounded-xl border border-border object-cover"
                />
              </Link>
            </li>
          ))
        : Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="aspect-square animate-pulse rounded-xl bg-surface-2" />
          ))}
    </ul>
  );
}

/** Highly rated but few votes — the page changes daily so there is always something new */
function HiddenGems({ media }: { media: MediaType }) {
  const t = useT();
  const { language } = useTmdbLocale();
  const [page] = useState(() => 1 + (Math.floor(Date.now() / 86400e3) % 5));
  const q = useQuery({
    queryKey: ["hidden-gems", media, page, language],
    queryFn: ({ signal }) =>
      discover(
        media,
        {
          language,
          page,
          include_adult: false,
          sort_by: "vote_average.desc",
          "vote_average.gte": 7.5,
          "vote_count.gte": 150,
          "vote_count.lte": 1500,
        },
        signal,
      ),
  });
  const choice = usePreferences((s) => s.rowLayouts["hub-gems"]) ?? "spotlight";
  const setRowLayout = usePreferences((s) => s.setRowLayout);
  const toggle = (
    <LayoutToggle
      value={choice}
      onChange={(v) => {
        setRowLayout("hub-gems", v === "spotlight" ? null : v);
      }}
    />
  );
  const common = {
    title: (
      <span className="inline-flex items-center gap-2">
        <Gem aria-hidden className="size-5 shrink-0 text-accent" strokeWidth={2} />
        {t("hub.gems")}
      </span>
    ),
    reason: t("hub.gemsReason"),
    movies: q.data?.results,
    isLoading: q.isPending,
    error: q.error,
    onRetry: () => q.refetch(),
    headerExtra: toggle,
  };
  return choice === "spotlight" ? (
    <SpotlightRow {...common} featureLabel={t("hub.gemsFeature")} />
  ) : (
    <MovieRow {...common} />
  );
}

interface TrendingPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
}

function TrendingPeople() {
  const t = useT();
  const { language } = useTmdbLocale();
  const q = useQuery({
    queryKey: ["trending-people", language],
    queryFn: ({ signal }) =>
      tmdbFetch<Paginated<TrendingPerson>>("/trending/person/week", { language }, signal),
    select: (d) => d.results.filter((p) => p.profile_path).slice(0, 18),
  });
  if (q.isError) return null;
  return (
    <Section title={t("hub.people")}>
      <Strip>
        {(q.data ?? PEOPLE_SKELETON).map((p) => (
          <li key={typeof p === "string" ? p : p.id} className="w-24 shrink-0 sm:w-28">
            {typeof p !== "string" ? (
              <Link to={personHref(p)} className="group block text-center">
                <img
                  src={tmdbImage(p.profile_path, "w185")}
                  alt=""
                  loading="lazy"
                  className="mx-auto aspect-square w-full rounded-full object-cover ring-2 ring-transparent transition group-hover:ring-accent"
                />
                <span className="mt-2 block truncate text-sm font-semibold">{p.name}</span>
                {p.known_for_department && (
                  <span className="block truncate text-xs text-muted">
                    {p.known_for_department}
                  </span>
                )}
              </Link>
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-full bg-surface-2" />
            )}
          </li>
        ))}
      </Strip>
    </Section>
  );
}

/** /discover — discovery hub: start from mood, topic, language, decade… instead of a dry filter grid */
export function DiscoverHubPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const media: MediaType = params.get("type") === "tv" ? "tv" : "movie";
  const setMedia = (m: MediaType) => {
    setParams(m === "tv" ? { type: "tv" } : {}, { replace: true });
  };
  const shelves = (
    <Section title={t("hub.shelves")}>
      <SeriesShelves />
    </Section>
  );

  return (
    <div className="mx-auto max-w-app space-y-7 px-4 py-5 sm:space-y-10 sm:px-6 sm:py-8">
      <PageMeta title={t("hub.title")} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight">{t("hub.title")}</h1>
          <p className="mt-1 text-muted">{t("hub.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={media}
            onChange={setMedia}
            ariaLabel={t("hub.title")}
            options={[
              { value: "movie", label: t("search.movies") },
              { value: "tv", label: t("search.tv") },
            ]}
          />
          <Link
            to={browseHref(media, {})}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-fg"
          >
            <FilterIcon size={14} />
            {t("hub.advanced")}
          </Link>
        </div>
      </header>

      <SurpriseMe media={media} />

      <Section title={t("tools.title")}>
        <ToolTiles />
      </Section>

      {media === "tv" && shelves}

      <Section title={t("hub.genres")}>
        <GenreTiles media={media} />
      </Section>

      <Section title={t("hub.themes")}>
        <ThemeTiles media={media} />
      </Section>

      {media === "movie" && shelves}

      <HiddenGems key={media} media={media} />

      <Section title={t("hub.languages")}>
        <LanguagePills media={media} />
      </Section>

      <Section title={t("hub.decades")}>
        <DecadeTiles media={media} />
      </Section>

      <Section
        title={t("hub.providers")}
        aside={<span className="text-xs text-muted">{t("hub.providersAttribution")}</span>}
      >
        <ProviderLogos media={media} />
      </Section>

      <TrendingPeople />
    </div>
  );
}
