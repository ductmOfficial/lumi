import { useCallback, useMemo, useState } from "react";
import { Outlet, useParams } from "react-router";
import { NotFoundPage } from "@/app/layout/RouteError";
import { ErrorState } from "@/components/ErrorState";
import { PageMeta } from "@/components/PageMeta";
import { ProfileLayout, type ProfileTab } from "@/components/profile/ProfileLayout";
import { ShareButton } from "@/components/profile/ShareButton";
import { MediaViewer } from "@/components/profile/MediaViewer";
import { imageItems } from "@/components/profile/media";
import { TmdbError } from "@/lib/tmdb";
import { mediaKey, parseIdParam } from "@/lib/slug";
import { ageFrom } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePersonalization } from "@/features/personalization/store";
import { externalLinks } from "@/features/movies/profile/links";
import { usePerson } from "../api";
import { mergeCredits } from "../credits";
import { departmentLabel } from "../departments";
import type { PersonProfileContext } from "./context";

export function PersonProfilePage() {
  const t = useT();
  const id = parseIdParam(useParams().personId);
  const { data: person, isPending, error, refetch } = usePerson(id);
  const history = usePersonalization((s) => s.history);

  const credits = useMemo(() => (person ? mergeCredits(person) : []), [person]);
  const mutualIds = useMemo(() => {
    const keys = new Set(credits.map((c) => mediaKey(c.movie)));
    return new Set(history.map((h) => mediaKey(h.movie)).filter((k) => keys.has(k)));
  }, [credits, history]);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);
  const mediaItems = useMemo(
    () => (person ? imageItems(person.images.profiles, t("profile.tab.photos")) : []),
    [person, t],
  );
  const openPhoto = useCallback(
    (path: string) => {
      const i = mediaItems.findIndex((m) => m.id === `img-${path}`);
      if (i >= 0) setMediaIndex(i);
    },
    [mediaItems],
  );

  if (!Number.isFinite(id)) return <NotFoundPage />;
  if (isPending)
    return (
      <div className="mx-auto max-w-profile animate-pulse">
        <div className="aspect-[16/9] max-h-[420px] bg-surface-2 sm:aspect-[21/8] lg:rounded-b-xl" />
        <div className="-mt-16 ml-8 h-36 w-36 rounded-full border-4 border-bg bg-surface-2" />
      </div>
    );
  if (error) {
    if (error instanceof TmdbError && error.status === 404) return <NotFoundPage />;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  // Cover image: backdrops from this person's best-known titles
  const covers = [...credits]
    .sort((a, b) => b.movie.vote_count - a.movie.vote_count)
    .flatMap((c) => (c.movie.backdrop_path ? [c.movie.backdrop_path] : []))
    .slice(0, 8);
  const age = person.birthday ? ageFrom(person.birthday, person.deathday) : null;
  const links = externalLinks(person.external_ids);

  const tabs: ProfileTab[] = [
    { to: "", label: t("profile.tab.lifeEvents") },
    { to: "about", label: t("profile.tab.about") },
    { to: "movies", label: t("person.works"), count: credits.length },
    { to: "photos", label: t("profile.tab.photos"), count: person.images.profiles.length },
  ];
  const context: PersonProfileContext = { person, credits, mutualIds, openPhoto };

  return (
    <>
      <PageMeta title={person.name} description={person.biography} />
      <ProfileLayout
        covers={covers}
        avatar={{ path: person.profile_path, alt: person.name, shape: "circle" }}
        title={person.name}
        subtitle={
          <span>
            {departmentLabel(person.known_for_department, t)}
            {age !== null &&
              ` · ${person.deathday ? t("person.diedAge", { n: age }) : t("person.age", { n: age })}`}
          </span>
        }
        stats={
          <span className="flex flex-wrap items-center justify-center gap-x-3 sm:justify-start">
            <span>
              {t("person.creditsCountAll", {
                movies: credits.filter((c) => c.movie.media_type !== "tv").length,
                tv: credits.filter((c) => c.movie.media_type === "tv").length,
              })}
            </span>
            {mutualIds.size > 0 && (
              <span className="text-accent">{t("person.mutual", { n: mutualIds.size })}</span>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap justify-center gap-2">
            {links.slice(0, 3).map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-border"
              >
                {l.label}
              </a>
            ))}
            <ShareButton title={person.name} />
          </div>
        }
        tabs={tabs}
      >
        <Outlet context={context} />
      </ProfileLayout>
      <MediaViewer
        items={mediaItems}
        index={mediaIndex}
        onIndexChange={setMediaIndex}
        title={person.name}
      />
    </>
  );
}
