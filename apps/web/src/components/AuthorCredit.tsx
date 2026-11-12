import { useT } from "@/i18n/useT";
import { CodeIcon } from "./icons";

const GITHUB_URL = "https://github.com/ductmOfficial";

/** Author credit in the footer */
export function AuthorCredit() {
  const t = useT();
  return (
    <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
      {t("footer.madeBy")}
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        title={t("footer.github")}
        className="group inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-semibold text-fg transition hover:border-accent hover:text-accent"
      >
        <CodeIcon size={13} className="text-accent" />
        ductran
      </a>
    </p>
  );
}
