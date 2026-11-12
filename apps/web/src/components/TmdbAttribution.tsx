import { useState } from "react";
import { useT } from "@/i18n/useT";

/**
 * Required by the TMDB API Terms of Use (section 3): TMDB logo + notice.
 * Download the official logo from https://www.themoviedb.org/about/logos-attribution
 * and save it as public/tmdb-logo.svg. The logo must be less prominent than the app's own logo.
 */
export function TmdbAttribution() {
  const t = useT();
  const [logoOk, setLogoOk] = useState(true);
  return (
    <div className="flex flex-col items-center gap-3 text-center text-xs text-muted sm:flex-row sm:text-left">
      <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="shrink-0">
        {logoOk ? (
          <img
            src="/tmdb-logo.svg"
            alt="TMDB"
            className="h-4 w-auto"
            onError={() => {
              setLogoOk(false);
            }}
          />
        ) : (
          <span className="font-semibold text-accent">TMDB</span>
        )}
      </a>
      <p>{t("footer.attribution")}</p>
    </div>
  );
}
