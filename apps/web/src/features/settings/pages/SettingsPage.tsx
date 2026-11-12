import { useWatchProviders } from "@/features/discover/api/queries";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import clsx from "clsx";
import { PageMeta } from "@/components/PageMeta";
import { TmdbAttribution } from "@/components/TmdbAttribution";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckIcon,
  HistoryIcon,
  MonitorIcon,
  RotateCcwIcon,
  SparklesIcon,
  SpotlightLayoutIcon,
  TrashIcon,
} from "@/components/icons";
import { useT } from "@/i18n/useT";
import { usePreferences, type Locale } from "@/stores/preferences";
import { toast } from "@/stores/toast";
import {
  getTheme,
  type ThemeDefinition,
  type ThemeId,
  type ThemePreference,
} from "@/themes/registry";
import { usePersonalization } from "@/features/personalization/store";
import { useLibrary } from "@/features/library/store";

const REGIONS = ["VN", "US", "GB", "JP", "KR", "FR", "DE", "SG", "TH", "AU"];

function Section({
  title,
  children,
  description,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div>
        <h2 className="font-bold">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const BTN =
  "inline-flex shrink-0 self-start items-center justify-center gap-1.5 whitespace-nowrap rounded-lg sm:self-auto border border-border px-4 py-2 text-sm transition hover:border-fg disabled:pointer-events-none disabled:opacity-40";

/** Icon tile color per setting type (full class names so Tailwind can scan them) */
const TONE = {
  accent: "bg-accent/12 text-accent",
  blue: "bg-viz-1/12 text-viz-1",
  amber: "bg-warning/15 text-warning",
  green: "bg-success/15 text-success",
  danger: "bg-danger/12 text-danger",
} as const;

/** One settings row: icon tile · name + explanation · action button (mobile: the button wraps below, aligned with the text) */
function SettingRow({
  icon,
  tone = "accent",
  title,
  description,
  danger,
  children,
}: {
  icon: ReactNode;
  tone?: keyof typeof TONE;
  title: string;
  description: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 px-1 py-4 first:pt-1 last:pb-1 sm:items-center sm:gap-4">
      <span
        aria-hidden
        className={clsx(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          TONE[danger ? "danger" : tone],
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className={clsx("text-sm font-semibold", danger && "text-danger")}>{title}</p>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
        {children}
      </div>
    </li>
  );
}

function ThemeSwatch({ theme }: { theme: Pick<ThemeDefinition, "preview"> }) {
  const p = theme.preview;
  return (
    <div
      className="flex h-16 overflow-hidden rounded-lg border border-border"
      style={{ background: p.bg }}
    >
      <div
        className="m-2 flex-1 space-y-1.5 rounded-md p-2 backdrop-blur-md"
        style={{
          background: p.surface,
          boxShadow: p.surface.includes("/") ? "inset 0 1px 0 rgb(255 255 255 / 0.5)" : undefined,
        }}
      >
        <div className="h-1.5 w-3/4 rounded" style={{ background: p.fg, opacity: 0.8 }} />
        <div className="h-1.5 w-1/2 rounded" style={{ background: p.fg, opacity: 0.4 }} />
        <div className="h-2 w-8 rounded" style={{ background: p.accent }} />
      </div>
    </div>
  );
}

function StreamingServicePicker() {
  const t = useT();
  const service = usePreferences((s) => s.streamingService);
  const setService = usePreferences((s) => s.setStreamingService);
  const providers = useWatchProviders("movie");
  const options = providers.data ?? [];
  // keep the saved service listed even when it is not offered in the current region
  const listed = service && !options.some((p) => p.provider_id === service.id);

  return (
    <label className="block space-y-1.5 pt-2">
      <span className="text-sm text-muted">{t("settings.streaming")}</span>
      <select
        value={service?.id ?? ""}
        onChange={(e) => {
          const id = Number(e.target.value);
          const picked = options.find((p) => p.provider_id === id);
          setService(picked ? { id, name: picked.provider_name } : null);
        }}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm sm:w-60"
      >
        <option value="">{t("settings.streamingNone")}</option>
        {listed && <option value={service.id}>{service.name}</option>}
        {options.map((p) => (
          <option key={p.provider_id} value={p.provider_id}>
            {p.provider_name}
          </option>
        ))}
      </select>
      <span className="block text-xs text-muted">{t("settings.streamingHint")}</span>
    </label>
  );
}

export function SettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { locale, region, theme, setLocale, setRegion, setTheme } = usePreferences();
  const historyCount = usePersonalization((s) => s.history.length);
  const rowLayoutCount = usePreferences((s) => Object.keys(s.rowLayouts).length);
  const resetRowLayouts = usePreferences((s) => s.resetRowLayouts);
  const clearHistory = usePersonalization((s) => s.clearHistory);
  const restartOnboarding = usePersonalization((s) => s.restartOnboarding);
  const resetAll = usePersonalization((s) => s.resetAll);

  // row 1: Classic, row 2: Liquid Glass — each row: auto · light · dark
  const autoSwatch = (light: ThemeDefinition, dark: ThemeDefinition) => (
    <div className="flex h-16 overflow-hidden rounded-lg border border-border">
      <div className="flex-1" style={{ background: light.preview.bg }} />
      <div className="flex-1" style={{ background: dark.preview.bg }} />
      <MonitorIcon className="absolute left-1/2 top-[2.2rem] -translate-x-1/2 text-accent" />
    </div>
  );
  const themeOption = (id: ThemeId) => {
    const th = getTheme(id);
    return { id, label: th.label[locale], swatch: <ThemeSwatch theme={th} /> };
  };
  const options: { id: ThemePreference; label: string; swatch: ReactNode }[] = [
    {
      id: "system",
      label: t("settings.theme.system"),
      swatch: autoSwatch(getTheme("light"), getTheme("dark")),
    },
    themeOption("light"),
    themeOption("dark"),
    {
      id: "glass-system",
      label: t("settings.theme.glassSystem"),
      swatch: autoSwatch(getTheme("glass-light"), getTheme("glass-dark")),
    },
    themeOption("glass-light"),
    themeOption("glass-dark"),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-8">
      <PageMeta title={t("settings.title")} />
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Section title={t("settings.theme")} description={t("settings.themeHint")}>
        <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {options.map((o) => (
            <button
              type="button"
              key={o.id}
              role="radio"
              aria-checked={theme === o.id}
              onClick={() => {
                setTheme(o.id);
              }}
              className={clsx(
                "relative space-y-2 rounded-xl border-2 p-2 text-left transition",
                theme === o.id ? "border-accent" : "border-transparent hover:border-border",
              )}
            >
              {o.swatch}
              <span className="flex items-center justify-between px-1 text-sm font-medium">
                {o.label}
                {theme === o.id && <CheckIcon size={16} className="text-accent" />}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("settings.language")}>
        <div className="flex gap-2">
          {(["vi", "en"] as Locale[]).map((l) => (
            <button
              type="button"
              key={l}
              aria-pressed={locale === l}
              onClick={() => {
                setLocale(l);
              }}
              className={clsx(
                "rounded-lg border px-4 py-2 text-sm font-medium",
                locale === l
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border hover:border-fg",
              )}
            >
              {l === "vi" ? "Tiếng Việt" : "English"}
            </button>
          ))}
        </div>
        <label className="block space-y-1.5 pt-2">
          <span className="text-sm text-muted">{t("settings.region")}</span>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
            }}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm sm:w-60"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {new Intl.DisplayNames([locale], { type: "region" }).of(r)} ({r})
              </option>
            ))}
          </select>
        </label>
        <StreamingServicePicker />
      </Section>

      <Section
        title={t("settings.personalization")}
        description={t("settings.personalizationHint")}
      >
        <ul className="-mx-1 divide-y divide-border">
          <SettingRow
            icon={<ChartIcon size={20} />}
            title={t("settings.p.insights")}
            description={t("settings.p.insightsDesc")}
          >
            <Link
              to="/insights"
              className={clsx(
                BTN,
                "border-accent bg-accent font-semibold text-accent-fg hover:opacity-90",
              )}
            >
              {t("settings.p.open")} <ArrowRightIcon size={16} />
            </Link>
          </SettingRow>
          <SettingRow
            icon={<HistoryIcon size={20} />}
            tone="blue"
            title={t("settings.p.history")}
            description={t("settings.p.historyDesc", { n: historyCount })}
          >
            <button
              type="button"
              onClick={() => {
                clearHistory();
                toast(t("settings.historyCleared"));
              }}
              disabled={historyCount === 0}
              className={BTN}
            >
              <TrashIcon size={15} /> {t("settings.p.clear")}
            </button>
          </SettingRow>
          <SettingRow
            icon={<SparklesIcon size={20} />}
            tone="amber"
            title={t("settings.p.tastes")}
            description={t("settings.p.tastesDesc")}
          >
            <button
              type="button"
              onClick={() => {
                restartOnboarding();
                void navigate("/");
              }}
              className={BTN}
            >
              <SparklesIcon size={15} /> {t("settings.p.retake")}
            </button>
          </SettingRow>
          <SettingRow
            icon={<SpotlightLayoutIcon size={20} />}
            tone="green"
            title={t("settings.p.layouts")}
            description={
              rowLayoutCount
                ? t("settings.p.layoutsDesc", { n: rowLayoutCount })
                : t("settings.p.layoutsNone")
            }
          >
            <button
              type="button"
              onClick={() => {
                resetRowLayouts();
                toast(t("settings.rowLayoutsReset"));
              }}
              disabled={rowLayoutCount === 0}
              className={BTN}
            >
              <RotateCcwIcon size={15} /> {t("settings.p.restore")}
            </button>
          </SettingRow>
          <SettingRow
            icon={<TrashIcon size={20} />}
            title={t("settings.p.deleteAll")}
            description={t("settings.p.deleteAllDesc")}
            danger
          >
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("settings.resetConfirm"))) {
                  resetAll();
                  useLibrary.getState().reset();
                  toast(t("settings.resetDone"));
                }
              }}
              className={clsx(
                BTN,
                "border-danger/50 text-danger hover:border-danger hover:bg-danger/10",
              )}
            >
              <TrashIcon size={15} /> {t("settings.p.delete")}
            </button>
          </SettingRow>
        </ul>
      </Section>

      <Section title={t("settings.about")}>
        <TmdbAttribution />
      </Section>
    </div>
  );
}
