import type { WatchProvider, WatchProvidersByRegion } from "@/lib/tmdb";
import { tmdbImage } from "@/lib/tmdb";
import { useT } from "@/i18n/useT";
import type { MessageKey } from "@lumi/i18n";
import { ExternalLink } from "lucide-react";
import { usePreferences } from "@/stores/preferences";
import { isOnService, serviceSearchUrl } from "./streamingLinks";

const GROUPS: { key: "flatrate" | "free" | "ads" | "rent" | "buy"; label: MessageKey }[] = [
  { key: "flatrate", label: "movie.stream" },
  { key: "free", label: "movie.free" },
  { key: "ads", label: "movie.ads" },
  { key: "rent", label: "movie.rent" },
  { key: "buy", label: "movie.buy" },
];

function ProviderLogos({ providers, link }: { providers: WatchProvider[]; link?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {providers
        .slice()
        .sort((a, b) => a.display_priority - b.display_priority)
        .map((p) => (
          <li key={p.provider_id}>
            <a
              href={link ?? "https://www.justwatch.com"}
              target="_blank"
              rel="noreferrer"
              title={p.provider_name}
              className="block rounded-lg transition hover:opacity-80"
            >
              <img
                src={tmdbImage(p.logo_path, "w154")}
                alt={p.provider_name}
                loading="lazy"
                className="h-10 w-10 rounded-lg"
              />
            </a>
          </li>
        ))}
    </ul>
  );
}

/** "Where to watch" content (without the frame) — placed inside a ProfileCard. */
export function WatchProviders({
  data,
  title,
}: {
  data: WatchProvidersByRegion | undefined;
  title: string;
}) {
  const t = useT();
  const service = usePreferences((s) => s.streamingService);
  const groups = GROUPS.flatMap((g) => {
    const providers = data?.[g.key];
    return providers?.length ? [{ ...g, providers }] : [];
  });
  const serviceUrl = service && isOnService(data, service) && serviceSearchUrl(service, title);

  return (
    <div className="space-y-3">
      {service && serviceUrl && (
        <a
          href={serviceUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90"
        >
          {t("movie.openOn", { name: service.name })}
          <ExternalLink size={15} aria-hidden />
        </a>
      )}
      {groups.length === 0 ? (
        <p className="text-sm text-muted">{t("movie.noProviders")}</p>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-muted">{t(g.label)}</p>
            <ProviderLogos providers={g.providers} link={data?.link} />
          </div>
        ))
      )}
      {/* JustWatch requires attribution wherever watch-provider data is shown */}
      <p className="text-[11px] text-muted">
        <a
          href={data?.link ?? "https://www.justwatch.com"}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          {t("movie.poweredByJustWatch")}
        </a>
      </p>
    </div>
  );
}
