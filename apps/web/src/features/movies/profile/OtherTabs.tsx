import { useMemo, useState } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { tmdbImage, type ImageItem } from "@/lib/tmdb";
import { keywordHref, personHref } from "@/lib/slug";
import { formatDate, formatUsd } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import { StarIcon, UserIcon } from "@/components/icons";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ExpandableText } from "@/components/profile/ExpandableText";
import { PostCard } from "@/components/profile/PostCard";
import { LoadMore } from "@/components/LoadMore";
import { MovieGrid } from "@/components/MovieGrid";
import { ErrorState } from "@/components/ErrorState";
import { Segmented } from "@/components/Segmented";
import { useMediaReviews } from "@/features/tv/api";
import { reviewerAvatar } from "../timeline";
import { externalLinks, statusLabel } from "./links";
import { useMovieProfile } from "./context";

// ---------------------------------------------------------------- About
export function AboutTab() {
  const t = useT();
  const { movie } = useMovieProfile();
  const locale = usePreferences((s) => s.locale);
  const region = usePreferences((s) => s.region);
  const languageName = new Intl.DisplayNames([locale], { type: "language" });
  const regionName = new Intl.DisplayNames([locale], { type: "region" });
  const regional = movie.release_dates.results.find((r) => r.iso_3166_1 === region)
    ?.release_dates[0];

  const facts: [string, React.ReactNode][] = [
    [t("movie.originalTitle"), movie.original_title],
    [t("movie.status"), statusLabel(movie.status, t)],
    [movie.tv ? t("tv.firstAir") : t("movie.releaseDate"), formatDate(movie.release_date, locale)],
    ...(regional
      ? ([
          [
            t("about.releaseIn", { country: regionName.of(region) ?? region }),
            formatDate(regional.release_date, locale),
          ],
        ] as [string, string][])
      : []),
    [t("about.originalLanguage"), languageName.of(movie.original_language)],
    [
      t("about.spokenLanguages"),
      movie.spoken_languages
        .map((l) => languageName.of(l.iso_639_1) ?? l.english_name)
        .join(", ") || "—",
    ],
    [
      t("about.countries"),
      movie.production_countries.map((c) => regionName.of(c.iso_3166_1) ?? c.name).join(", ") ||
        "—",
    ],
    ...((movie.tv
      ? [
          [t("tv.lastAir"), formatDate(movie.tv.last_air_date, locale)],
          [
            t("tv.tab.seasons"),
            `${t("tv.seasons", { n: movie.tv.number_of_seasons })} · ${t("tv.episodes", { n: movie.tv.number_of_episodes })}`,
          ],
          [t("tv.network"), movie.tv.networks.map((n) => n.name).join(", ") || "—"],
          [t("tv.type"), movie.tv.type || "—"],
        ]
      : [
          [t("movie.budget"), formatUsd(movie.budget, locale)],
          [t("movie.revenue"), formatUsd(movie.revenue, locale)],
        ]) as [string, string][]),
  ];
  const links = externalLinks(movie.external_ids, movie.homepage);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="space-y-4">
        <ProfileCard title={t("movie.overview")}>
          {movie.tagline && <p className="mb-2 italic text-fg/80">“{movie.tagline}”</p>}
          <p className="whitespace-pre-line leading-relaxed">
            {movie.overview || t("common.noOverview")}
          </p>
        </ProfileCard>
        <ProfileCard title={t("about.details")}>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </ProfileCard>
      </div>
      <div className="space-y-4">
        {movie.production_companies.length > 0 && (
          <ProfileCard title={t("about.companies")}>
            <ul className="space-y-3">
              {movie.production_companies.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-white p-1">
                    {c.logo_path ? (
                      <img
                        src={tmdbImage(c.logo_path, "w92")}
                        alt=""
                        loading="lazy"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-black">{c.name.slice(0, 3)}</span>
                    )}
                  </div>
                  <span className="text-sm">
                    {c.name}
                    {c.origin_country && (
                      <span className="text-muted"> · {regionName.of(c.origin_country)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </ProfileCard>
        )}
        {movie.keywords.keywords.length > 0 && (
          <ProfileCard title={t("about.keywords")}>
            <div className="flex flex-wrap gap-1.5">
              {movie.keywords.keywords.map((k) => (
                <Link
                  key={k.id}
                  to={keywordHref(k.id, movie.media_type)}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-xs transition hover:bg-accent hover:text-accent-fg"
                >
                  #{k.name}
                </Link>
              ))}
            </div>
          </ProfileCard>
        )}
        {links.length > 0 && (
          <ProfileCard title={t("about.links")}>
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:bg-border"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          </ProfileCard>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Cast & crew
function PersonTile({
  id,
  name,
  role,
  path,
}: {
  id: number;
  name: string;
  role: string;
  path: string | null;
}) {
  return (
    <Link
      to={personHref({ id, name })}
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-2 hover:border-accent"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {path ? (
          <img
            src={tmdbImage(path, "w185")}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <UserIcon />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold group-hover:underline">{name}</p>
        <p className="line-clamp-2 text-sm text-muted">{role}</p>
      </div>
    </Link>
  );
}

export function CastTab() {
  const t = useT();
  const { movie } = useMovieProfile();
  const [mode, setMode] = useState<"cast" | "crew">("cast");
  const crewByDept = useMemo(() => {
    const map = new Map<string, typeof movie.credits.crew>();
    for (const c of movie.credits.crew)
      map.set(c.department, [...(map.get(c.department) ?? []), c]);
    return [...map.entries()].sort((a, b) =>
      a[0] === "Directing" ? -1 : b[0] === "Directing" ? 1 : a[0].localeCompare(b[0]),
    );
  }, [movie]);

  return (
    <ProfileCard
      title={
        <span className="flex flex-wrap items-center gap-3">
          {t("profile.tab.cast")}
          <Segmented
            ariaLabel={t("profile.tab.cast")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "cast", label: `${t("cast.actors")} (${movie.credits.cast.length})` },
              { value: "crew", label: `${t("cast.crew")} (${movie.credits.crew.length})` },
            ]}
          />
        </span>
      }
    >
      {mode === "cast" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {movie.credits.cast.map((c) => (
            <PersonTile
              key={c.credit_id}
              id={c.id}
              name={c.name}
              role={c.character}
              path={c.profile_path}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {crewByDept.map(([dept, people]) => (
            <div key={dept}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{dept}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((c) => (
                  <PersonTile
                    key={c.credit_id}
                    id={c.id}
                    name={c.name}
                    role={c.job}
                    path={c.profile_path}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfileCard>
  );
}

// ---------------------------------------------------------------- Photos
type PhotoKind = "backdrops" | "posters" | "logos";

export function PhotosTab() {
  const t = useT();
  const { movie, openMedia } = useMovieProfile();
  const [kind, setKind] = useState<PhotoKind>("backdrops");
  const images: ImageItem[] = movie.images[kind];

  return (
    <ProfileCard
      title={
        <span className="flex flex-wrap items-center gap-3">
          {t("profile.tab.photos")}
          <Segmented
            ariaLabel={t("profile.tab.photos")}
            value={kind}
            onChange={setKind}
            options={[
              {
                value: "backdrops",
                label: `${t("photos.backdrops")} (${movie.images.backdrops.length})`,
              },
              {
                value: "posters",
                label: `${t("photos.posters")} (${movie.images.posters.length})`,
              },
              { value: "logos", label: `${t("photos.logos")} (${movie.images.logos.length})` },
            ]}
          />
        </span>
      }
    >
      {images.length === 0 ? (
        <p className="text-sm text-muted">{t("photos.empty")}</p>
      ) : (
        <div
          className={clsx(
            "grid gap-1.5",
            kind === "posters"
              ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {images.map((img) => (
            <button
              type="button"
              key={img.file_path}
              onClick={() => {
                openMedia(`img-${img.file_path}`);
              }}
              className={clsx(
                "overflow-hidden rounded-md",
                kind === "posters" ? "aspect-[2/3]" : "aspect-video",
                kind === "logos"
                  ? "bg-gradient-to-br from-zinc-700 to-zinc-900 p-3"
                  : "bg-surface-2",
              )}
            >
              <img
                src={tmdbImage(img.file_path, kind === "posters" ? "w342" : "w500")}
                alt=""
                loading="lazy"
                className={clsx(
                  "h-full w-full transition hover:scale-105",
                  kind === "logos" ? "object-contain" : "object-cover",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </ProfileCard>
  );
}

// ---------------------------------------------------------------- Reviews
export function ReviewsTab() {
  const t = useT();
  const { movie } = useMovieProfile();
  const q = useMediaReviews(movie.media_type ?? "movie", movie.id);
  const reviews = q.data?.pages.flatMap((p) => p.results) ?? [];

  if (q.isPending) return <div className="h-40 animate-pulse rounded-xl bg-surface" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted">{t("reviews.note")}</p>
      {reviews.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {t("reviews.empty")}
        </p>
      ) : (
        reviews.map((r) => {
          const avatarUrl = reviewerAvatar(r.author_details.avatar_path);
          return (
            <PostCard
              key={r.id}
              avatar={
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 font-bold uppercase">
                    {r.author.slice(0, 1)}
                  </span>
                )
              }
              author={r.author_details.name || r.author}
              action={r.author_details.username ? `@${r.author_details.username}` : undefined}
              time={new Date(r.created_at).toLocaleDateString()}
              footer={
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-muted hover:text-fg hover:underline"
                >
                  {t("post.review.readOnTmdb")}
                </a>
              }
            >
              {r.author_details.rating != null && (
                <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold">
                  <StarIcon size={12} className="text-warning" /> {r.author_details.rating}/10
                </p>
              )}
              <ExpandableText text={r.content} lines={8} />
            </PostCard>
          );
        })
      )}
      <LoadMore
        hasNextPage={q.hasNextPage}
        isFetchingNextPage={q.isFetchingNextPage}
        fetchNextPage={() => q.fetchNextPage()}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Similar
export function SimilarTab() {
  const t = useT();
  const { movie } = useMovieProfile();
  return (
    <div className="space-y-8">
      {movie.recommendations.results.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("movie.recommendations")}</h2>
          <MovieGrid movies={movie.recommendations.results} />
        </section>
      )}
      {movie.similar.results.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("movie.similar")}</h2>
          <MovieGrid movies={movie.similar.results} />
        </section>
      )}
      {movie.recommendations.results.length + movie.similar.results.length === 0 && (
        <p className="text-sm text-muted">{t("search.empty")}</p>
      )}
    </div>
  );
}
