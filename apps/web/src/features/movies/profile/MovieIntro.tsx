import { Link } from "react-router";
import { tmdbImage } from "@/lib/tmdb";
import { personHref } from "@/lib/slug";
import { formatDate, formatRuntime, formatUsd } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import {
  CalendarIcon,
  ClockIcon,
  FilmIcon,
  GlobeIcon,
  LinkIcon,
  TvIcon,
  UserIcon,
} from "@/components/icons";
import { InfoRow, ProfileCard } from "@/components/profile/ProfileCard";
import { WatchProviders } from "../components/WatchProviders";
import { useMovieProfile } from "./context";
import { externalLinks, statusLabel } from "./links";
import { CollectionCard } from "./CollectionCard";
import { SeasonsCard } from "./SeasonsCard";

export function MovieIntro() {
  const t = useT();
  const { movie, openMedia } = useMovieProfile();
  const locale = usePreferences((s) => s.locale);
  const region = usePreferences((s) => s.region);
  const tv = movie.tv;
  // series: creators instead of the director
  const directors = movie.credits.crew.filter((c) =>
    tv ? c.job.includes("Creator") : c.job === "Director",
  );
  const languageName = new Intl.DisplayNames([locale], { type: "language" });
  const regionName = new Intl.DisplayNames([locale], { type: "region" });
  const countries = movie.production_countries.map((c) => regionName.of(c.iso_3166_1) ?? c.name);
  const links = externalLinks(movie.external_ids, movie.homepage);
  const photos = [...movie.images.backdrops, ...movie.images.posters].slice(0, 9);
  const cast = movie.credits.cast.slice(0, 9);
  const runtime = formatRuntime(movie.runtime);

  // gap instead of space-y: desktop-only cards (hidden lg:block) add no extra spacing on mobile
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard title={t("profile.intro")}>
        <ul className="space-y-3">
          {directors.length > 0 && (
            <InfoRow icon={<UserIcon size={18} />}>
              {tv ? t("tv.creator") : t("movie.director")}{" "}
              {directors.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <Link to={personHref(d)} className="font-semibold hover:underline">
                    {d.name}
                  </Link>
                </span>
              ))}
            </InfoRow>
          )}
          {movie.release_date && (
            <InfoRow icon={<CalendarIcon size={18} />}>
              {tv ? t("tv.firstAir") : t("movie.releaseDate")}{" "}
              <span className="font-semibold">{formatDate(movie.release_date, locale)}</span>
              {tv?.next_episode_to_air?.air_date && (
                <span className="block text-muted">
                  {t("tv.nextEpisode")}: {formatDate(tv.next_episode_to_air.air_date, locale)} (
                  {t("tv.episodeCode", {
                    s: tv.next_episode_to_air.season_number,
                    e: tv.next_episode_to_air.episode_number,
                  })}
                  )
                </span>
              )}
            </InfoRow>
          )}
          {tv && tv.networks.length > 0 && (
            <InfoRow icon={<TvIcon size={18} />}>
              {t("tv.network")}{" "}
              <span className="inline-flex flex-wrap items-center gap-2 align-middle">
                {tv.networks.map((n) =>
                  n.logo_path ? (
                    <img
                      key={n.id}
                      src={tmdbImage(n.logo_path, "w92")}
                      alt={n.name}
                      title={n.name}
                      className="h-5 w-auto rounded bg-white px-1 py-0.5"
                    />
                  ) : (
                    <span key={n.id} className="font-semibold">
                      {n.name}
                    </span>
                  ),
                )}
              </span>
            </InfoRow>
          )}
          {tv && (
            <InfoRow icon={<FilmIcon size={18} />}>
              <span className="font-semibold">{t("tv.seasons", { n: tv.number_of_seasons })}</span>{" "}
              · {t("tv.episodes", { n: tv.number_of_episodes })}
              {runtime && (
                <span className="text-muted">
                  {" "}
                  · {t("tv.episodeRuntime", { n: movie.runtime ?? 0 })}
                </span>
              )}
            </InfoRow>
          )}
          {!tv && runtime && <InfoRow icon={<ClockIcon size={18} />}>{runtime}</InfoRow>}
          <InfoRow icon={<GlobeIcon size={18} />}>
            {[countries.join(", "), languageName.of(movie.original_language)]
              .filter(Boolean)
              .join(" · ")}
          </InfoRow>
          <InfoRow icon={<FilmIcon size={18} />}>
            {t("movie.status")}:{" "}
            <span className="font-semibold">{statusLabel(movie.status, t)}</span>
            {(movie.budget > 0 || movie.revenue > 0) && (
              <span className="block text-muted">
                {t("movie.budget")} {formatUsd(movie.budget, locale)} · {t("movie.revenue")}{" "}
                {formatUsd(movie.revenue, locale)}
              </span>
            )}
          </InfoRow>
          {links.length > 0 && (
            <InfoRow icon={<LinkIcon size={18} />}>
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-accent hover:underline"
                  >
                    {l.label}
                  </a>
                ))}
              </span>
            </InfoRow>
          )}
        </ul>
      </ProfileCard>

      {/* Collection (movies) / Seasons (series): right below About — visible on mobile too (this column sits above the timeline) */}
      <CollectionCard movie={movie} />
      <SeasonsCard movie={movie} />

      <ProfileCard
        title={t("movie.whereToWatch")}
        subtitle={new Intl.DisplayNames([locale], { type: "region" }).of(region)}
      >
        <WatchProviders data={movie["watch/providers"].results[region]} title={movie.title} />
      </ProfileCard>

      {photos.length > 0 && (
        <ProfileCard title={t("profile.tab.photos")} seeAllTo="photos" className="hidden lg:block">
          <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
            {photos.map((p, i) => (
              <button
                type="button"
                key={p.file_path}
                onClick={() => {
                  openMedia(`img-${p.file_path}`);
                }}
                aria-label={`${t("media.viewPhoto")} ${i + 1}`}
                className="aspect-square overflow-hidden bg-surface-2"
              >
                <img
                  src={tmdbImage(p.file_path, "w780")}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition hover:scale-105"
                />
              </button>
            ))}
          </div>
        </ProfileCard>
      )}

      {cast.length > 0 && (
        <ProfileCard
          title={t("profile.tab.cast")}
          subtitle={t("profile.castCount", { n: movie.credits.cast.length })}
          seeAllTo="cast"
          className="hidden lg:block"
        >
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {cast.map((c) => (
              <Link key={c.credit_id} to={personHref(c)} className="group">
                <div className="aspect-square overflow-hidden rounded-lg bg-surface-2">
                  {c.profile_path && (
                    <img
                      src={tmdbImage(c.profile_path, "w342")}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-tight group-hover:underline">
                  {c.name}
                </p>
              </Link>
            ))}
          </div>
        </ProfileCard>
      )}
    </div>
  );
}
