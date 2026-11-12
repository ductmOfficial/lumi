import { useMemo, useRef, useState } from "react";
import { Cake, Flower } from "lucide-react";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { LoadMore } from "@/components/LoadMore";
import { Link } from "react-router";
import clsx from "clsx";
import { tmdbImage } from "@/lib/tmdb";
import { mediaKey, movieHref } from "@/lib/slug";
import { formatDate, formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { usePreferences } from "@/stores/preferences";
import {
  CakeIcon,
  CalendarIcon,
  FilmIcon,
  LinkIcon,
  MapPinIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { InfoRow, ProfileCard } from "@/components/profile/ProfileCard";
import { ExpandableText } from "@/components/profile/ExpandableText";
import { PostCard } from "@/components/profile/PostCard";
import { HighlightCard } from "@/components/profile/HighlightCard";
import { useStickySidebar } from "@/hooks/useStickySidebar";
import { Poster } from "@/components/Poster";
import { Segmented } from "@/components/Segmented";
import { externalLinks } from "@/features/movies/profile/links";
import { buildLifeEvents, type LifeEvent, type PersonCredit } from "../credits";
import { departmentLabel } from "../departments";
import { usePersonProfile } from "./context";

function CreditStrip({ credits, mutualIds }: { credits: PersonCredit[]; mutualIds: Set<string> }) {
  const t = useT();
  const stripRef = useRef<HTMLDivElement>(null);
  useHorizontalScroll(stripRef);
  return (
    <div ref={stripRef} className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {credits.map((c) => (
        <Link key={mediaKey(c.movie)} to={movieHref(c.movie)} className="group w-24 shrink-0">
          <div className="relative">
            <Poster path={c.movie.poster_path} alt={c.movie.title} sizes="96px" />
            {mutualIds.has(mediaKey(c.movie)) && (
              <span className="absolute left-1 top-1 rounded bg-accent px-1 text-[9px] font-bold text-accent-fg">
                {t("person.watched")}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-semibold group-hover:underline">
            {c.movie.title}
          </p>
          {c.roles[0] && <p className="line-clamp-1 text-[11px] text-muted">{c.roles[0]}</p>}
        </Link>
      ))}
    </div>
  );
}

function PersonIntro() {
  const t = useT();
  const { person, credits, mutualIds, openPhoto } = usePersonProfile();
  const locale = usePreferences((s) => s.locale);
  const links = externalLinks(person.external_ids, person.homepage);
  const knownFor = [...credits].sort((a, b) => b.movie.vote_count - a.movie.vote_count).slice(0, 9);
  const mutual = credits.filter((c) => mutualIds.has(mediaKey(c.movie)));
  const photos = person.images.profiles.slice(0, 9);

  // gap instead of space-y: desktop-only cards (hidden lg:block) add no extra spacing on mobile
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard title={t("profile.intro")}>
        {person.biography && (
          <ExpandableText
            text={person.biography}
            lines={4}
            className="mb-4 text-sm leading-relaxed"
          />
        )}
        <ul className="space-y-3">
          <InfoRow icon={<FilmIcon size={18} />}>
            {t("person.knownFor")}{" "}
            <span className="font-semibold">{departmentLabel(person.known_for_department, t)}</span>
          </InfoRow>
          {person.birthday && (
            <InfoRow icon={<CakeIcon size={18} />}>
              {t("person.born")}{" "}
              <span className="font-semibold">{formatDate(person.birthday, locale)}</span>
            </InfoRow>
          )}
          {person.place_of_birth && (
            <InfoRow icon={<MapPinIcon size={18} />}>
              {t("person.from")} <span className="font-semibold">{person.place_of_birth}</span>
            </InfoRow>
          )}
          {person.deathday && (
            <InfoRow icon={<CalendarIcon size={18} />}>
              {t("person.died")}{" "}
              <span className="font-semibold">{formatDate(person.deathday, locale)}</span>
            </InfoRow>
          )}
          {person.also_known_as.length > 0 && (
            <InfoRow icon={<UsersIcon size={18} />}>
              {t("person.aka")}{" "}
              <span className="font-semibold">{person.also_known_as.slice(0, 3).join(", ")}</span>
            </InfoRow>
          )}
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

      {mutual.length > 0 && (
        <ProfileCard
          title={t("person.mutualTitle")}
          subtitle={t("person.mutual", { n: mutual.length })}
        >
          <CreditStrip credits={mutual} mutualIds={mutualIds} />
        </ProfileCard>
      )}

      <ProfileCard title={t("person.knownForTitle")} seeAllTo="movies" className="hidden lg:block">
        <div className="grid grid-cols-3 gap-x-2 gap-y-3">
          {knownFor.map((c) => (
            <Link key={mediaKey(c.movie)} to={movieHref(c.movie)} className="group">
              <Poster path={c.movie.poster_path} alt={c.movie.title} sizes="120px" />
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-tight group-hover:underline">
                {c.movie.title}
              </p>
            </Link>
          ))}
        </div>
      </ProfileCard>

      {photos.length > 1 && (
        <ProfileCard title={t("profile.tab.photos")} seeAllTo="photos" className="hidden lg:block">
          <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
            {photos.map((p) => (
              <button
                type="button"
                key={p.file_path}
                onClick={() => {
                  openPhoto(p.file_path);
                }}
                className="aspect-square overflow-hidden bg-surface-2"
              >
                <img
                  src={tmdbImage(p.file_path, "w342")}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition hover:scale-105"
                />
              </button>
            ))}
          </div>
        </ProfileCard>
      )}
    </div>
  );
}

const PAGE = 8;

/** Default person tab: "Life events" + the About column. */
export function LifeEventsTab() {
  const t = useT();
  const { person, mutualIds } = usePersonProfile();
  const locale = usePreferences((s) => s.locale);
  const [now] = useState(() => new Date());
  const events = useMemo(() => buildLifeEvents(person, now), [person, now]);
  const [limit, setLimit] = useState(PAGE);
  const [asideRef, asideStyle] = useStickySidebar<HTMLElement>(124);

  const avatar = (
    <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-2">
      {person.profile_path && (
        <img
          src={tmdbImage(person.profile_path, "w185")}
          alt=""
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
  const icon = (node: React.ReactNode, cls: string) => (
    <span className={clsx("flex h-10 w-10 items-center justify-center rounded-full", cls)}>
      {node}
    </span>
  );

  const render = (e: LifeEvent) => {
    switch (e.kind) {
      case "upcoming":
        return (
          <PostCard
            pinned
            avatar={avatar}
            author={person.name}
            verified
            action={t("life.upcoming", { n: e.credits.length })}
            time={formatDate(e.date, locale)}
          >
            <CreditStrip credits={e.credits} mutualIds={mutualIds} />
          </PostCard>
        );
      case "birth":
        return (
          <PostCard
            avatar={icon(<CakeIcon />, "bg-accent/15 text-accent")}
            author={person.name}
            verified
            action={t("life.born")}
            time={formatDate(e.date, locale)}
            media={
              <HighlightCard
                tone="gold"
                icon={<Cake className="size-10" strokeWidth={1.5} />}
                eyebrow={t("life.bornEyebrow")}
                title={formatDate(e.date, locale)}
                subtitle={e.place ?? undefined}
              />
            }
          />
        );
      case "death":
        return (
          <PostCard
            avatar={icon(<CalendarIcon />, "bg-surface-2 text-muted")}
            author={person.name}
            verified
            action={t("life.died")}
            time={formatDate(e.date, locale)}
            media={
              <HighlightCard
                tone="night"
                icon={<Flower className="size-10" strokeWidth={1.5} />}
                eyebrow={t("life.diedEyebrow")}
                title={formatDate(e.date, locale)}
              />
            }
          />
        );
      case "debut":
      case "breakout":
        return (
          <PostCard
            avatar={icon(
              e.kind === "debut" ? <SparklesIcon /> : <StarIcon />,
              e.kind === "debut" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
            )}
            author={person.name}
            verified
            action={t(e.kind === "debut" ? "life.debut" : "life.breakout")}
            time={formatDate(e.date, locale)}
          >
            <Link
              to={movieHref(e.credit.movie)}
              className="flex gap-3 rounded-lg bg-surface-2 p-2 hover:bg-border"
            >
              <Poster
                path={e.credit.movie.poster_path}
                alt={e.credit.movie.title}
                sizes="64px"
                className="w-16 shrink-0"
              />
              <div className="min-w-0 py-1">
                <p className="font-bold">{e.credit.movie.title}</p>
                <p className="text-sm text-muted">
                  {formatYear(e.credit.movie.release_date)} · {e.credit.roles.join(", ")}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs">
                  <StarIcon size={12} className="text-warning" />{" "}
                  {e.credit.movie.vote_average.toFixed(1)}
                </p>
              </div>
            </Link>
          </PostCard>
        );
      case "year":
        return (
          <PostCard
            avatar={avatar}
            author={person.name}
            verified
            action={t("life.year", { n: e.credits.length, year: e.year })}
            time={String(e.year)}
          >
            <CreditStrip credits={e.credits} mutualIds={mutualIds} />
          </PostCard>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside ref={asideRef} style={asideStyle} className="min-w-0 lg:sticky lg:self-start">
        <PersonIntro />
      </aside>
      <div className="min-w-0 space-y-4">
        {events.slice(0, limit).map((e) => (
          <div key={e.id}>{render(e)}</div>
        ))}
        {/* scrolling near the end → show more events */}
        <LoadMore
          hasNextPage={events.length > limit}
          loadedCount={limit}
          fetchNextPage={() => {
            setLimit((l) => l + PAGE);
          }}
        />
      </div>
    </div>
  );
}

export function PersonAboutTab() {
  const t = useT();
  const { person } = usePersonProfile();
  return (
    <div className="mx-auto max-w-3xl">
      <ProfileCard title={t("person.biography")}>
        <p className="whitespace-pre-line leading-relaxed">
          {person.biography || t("person.noBio")}
        </p>
      </ProfileCard>
    </div>
  );
}

export function PersonMoviesTab() {
  const t = useT();
  const { credits, mutualIds } = usePersonProfile();
  const [sort, setSort] = useState<"date" | "popular">("date");
  const [role, setRole] = useState<"all" | "cast" | "crew">("all");
  const [media, setMedia] = useState<"all" | "movie" | "tv">("all");

  const list = useMemo(() => {
    let l = credits;
    if (media !== "all") l = l.filter((c) => (c.movie.media_type ?? "movie") === media);
    if (role === "cast") l = l.filter((c) => c.isCast);
    if (role === "crew") l = l.filter((c) => !c.isCast || c.roles.length > 1);
    return [...l].sort((a, b) =>
      sort === "popular"
        ? b.movie.vote_count - a.movie.vote_count
        : (b.movie.release_date || "9999").localeCompare(a.movie.release_date || "9999"),
    );
  }, [credits, sort, role, media]);

  return (
    <ProfileCard
      title={
        <span className="flex flex-wrap items-center gap-3">
          {t("person.works")}
          <Segmented
            ariaLabel="media"
            value={media}
            onChange={setMedia}
            options={[
              { value: "all", label: t("videos.all") },
              { value: "movie", label: t("search.movies") },
              { value: "tv", label: t("search.tv") },
            ]}
          />
          <Segmented
            ariaLabel="role"
            value={role}
            onChange={setRole}
            options={[
              { value: "all", label: t("videos.all") },
              { value: "cast", label: t("cast.actors") },
              { value: "crew", label: t("cast.crew") },
            ]}
          />
          <Segmented
            ariaLabel="sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: "date", label: t("discover.sort.newest") },
              { value: "popular", label: t("discover.sort.popularity") },
            ]}
          />
        </span>
      }
    >
      <ul className="divide-y divide-border">
        {list.map((c) => (
          <li key={mediaKey(c.movie)}>
            <Link
              to={movieHref(c.movie)}
              className="flex items-center gap-3 py-2.5 hover:bg-surface-2 sm:px-2"
            >
              <span className="w-12 shrink-0 text-sm tabular-nums text-muted">
                {formatYear(c.movie.release_date)}
              </span>
              <Poster
                path={c.movie.poster_path}
                alt={c.movie.title}
                sizes="48px"
                className="w-10 shrink-0 rounded"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {c.movie.title}
                  {mutualIds.has(mediaKey(c.movie)) && (
                    <span className="ml-2 rounded bg-accent px-1 align-middle text-[10px] font-bold text-accent-fg">
                      {t("person.watched")}
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted">
                  {c.movie.media_type === "tv" && (
                    <span className="mr-1.5 rounded bg-surface-2 px-1 text-[10px] font-bold uppercase">
                      Series
                    </span>
                  )}
                  {c.roles.join(" · ")}
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-1 text-xs text-muted sm:inline-flex">
                <StarIcon size={12} className="text-warning" />
                {c.movie.vote_average.toFixed(1)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ProfileCard>
  );
}

export function PersonPhotosTab() {
  const t = useT();
  const { person, openPhoto } = usePersonProfile();
  const photos = person.images.profiles;
  return (
    <ProfileCard title={t("profile.tab.photos")}>
      {photos.length === 0 ? (
        <p className="text-sm text-muted">{t("photos.empty")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((p) => (
            <button
              type="button"
              key={p.file_path}
              onClick={() => {
                openPhoto(p.file_path);
              }}
              className="aspect-[2/3] overflow-hidden rounded-md bg-surface-2"
            >
              <img
                src={tmdbImage(p.file_path, "h632")}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </ProfileCard>
  );
}
