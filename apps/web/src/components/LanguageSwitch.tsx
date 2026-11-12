import { Button } from "@ductmofficial/sen-ui";
import clsx from "clsx";
import { ICON_BUTTON } from "@/app/layout/Header";
import { useT } from "@/i18n/useT";
import { usePreferences, type Locale } from "@/stores/preferences";
import { GlobeIcon } from "./icons";

const LABEL: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

/** Header: one button to quickly switch VI ⇄ EN */
export function LanguageToggle() {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const setLocale = usePreferences((s) => s.setLocale);
  return (
    <Button
      variant="secondary"
      onClick={() => {
        setLocale(locale === "vi" ? "en" : "vi");
      }}
      aria-label={`${t("lang.switch")}: ${LABEL[locale]}. ${t("lang.switchTo")}`}
      title={t("lang.switchTo")}
      className={ICON_BUTTON}
    >
      <GlobeIcon size={20} />
      <span className="text-xs font-bold uppercase">{locale}</span>
    </Button>
  );
}

/** Footer: language picker as text links */
export function LanguageLinks() {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const setLocale = usePreferences((s) => s.setLocale);
  return (
    <div
      role="group"
      aria-label={t("lang.switch")}
      className="flex items-center gap-1 text-xs text-muted"
    >
      <GlobeIcon size={14} />
      {(Object.keys(LABEL) as Locale[]).map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1">
          {i > 0 && <span aria-hidden>·</span>}
          <button
            type="button"
            onClick={() => {
              setLocale(l);
            }}
            aria-pressed={locale === l}
            lang={l}
            className={clsx(
              "rounded px-1 transition",
              locale === l ? "font-semibold text-fg" : "hover:text-accent",
            )}
          >
            {LABEL[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
