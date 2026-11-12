import { useMemo, useState, type ReactNode } from "react";
import { Clapperboard, Tv } from "lucide-react";
import { Link } from "react-router";
import { keywordHref } from "@/lib/slug";
import { tmdbImage, type MovieDetail, type ReleaseDate } from "@/lib/tmdb";
import { formatDate, formatNumber, formatRelative, formatRuntime, formatYear } from "@/lib/format";
import { useT, type TFunction } from "@/i18n/useT";
import type { MessageKey } from "@lumi/i18n";
import { usePreferences, type Locale } from "@/stores/preferences";
import { useStickySidebar } from "@/hooks/useStickySidebar";
import { StarIcon } from "@/components/icons";
import { PostCard } from "@/components/profile/PostCard";
import { MixedPhotoCollage } from "@/components/profile/PhotoCollage";
import { ExpandableText } from "@/components/profile/ExpandableText";
import { HighlightCard } from "@/components/profile/HighlightCard";
import { toneFor, type HighlightTone } from "@/components/profile/highlightTones";
import { useMatchPercent } from "@/features/personalization/hooks";
import { useMediaReviews } from "@/features/tv/api";
import { TrailerPlayer } from "../components/TrailerPlayer";
import { buildMovieTimeline, reviewerAvatar, type ImageType, type MoviePost } from "../timeline";
import { MovieIntro } from "./MovieIntro";
import { useMovieProfile, type MovieProfileContext } from "./context";

const RELEASE: Record<
  ReleaseDate["type"],
  { action: MessageKey; label: MessageKey; tone: HighlightTone }
> = {
  1: { action: "post.release.premiere", label: "release.type.premiere", tone: "violet" },
  2: { action: "post.release.theatrical", label: "release.type.theatrical", tone: "sunset" },
  3: { action: "post.release.theatrical", label: "release.type.theatrical", tone: "sunset" },
  4: { action: "post.release.digital", label: "release.type.digital", tone: "forest" },
  5: { action: "post.release.physical", label: "release.type.physical", tone: "gold" },
  6: { action: "post.release.tv", label: "release.type.tv", tone: "berry" },
};

const PHOTO_LABEL: Record<ImageType, MessageKey> = {
  backdrops: "photos.backdrops",
  posters: "photos.posters",
  logos: "photos.logos",
};

/** Header (title + tabs) is ~ 3.5rem + 3.25rem tall; add some padding */
const STICKY_OFFSET = 124;

function flag(country: string) {
  return country.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function MovieAvatar({ movie }: { movie: MovieDetail }) {
  return (
    <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-2">
      {movie.poster_path && (
        <img
          src={tmdbImage(movie.poster_path, "w185")}
          alt=""
          className="h-full w-full object-cover object-top"
        />
      )}
    </div>
  );
}

function TimeLabel({ date, locale }: { date: string; locale: Locale }) {
  return (
    <time dateTime={date} title={formatDate(date, locale)}>
      {formatRelative(date, locale)} · {formatDate(date, locale)}
    </time>
  );
}

/** Rating bar shown with the "Overview" post. */
function RatingSummary({ movie }: { movie: MovieDetail }) {
  const t = useT();
  const locale = usePreferences((s) => s.locale);
  const match = useMatchPercent(movie.genres.map((g) => g.id));
  const runtime = formatRuntime(movie.runtime);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15 text-lg font-black text-warning">
          {movie.vote_average ? movie.vote_average.toFixed(1) : "—"}
        </div>
        <div className="text-xs">
          <p
            className="flex gap-0.5 text-warning"
            role="img"
            aria-label={`${movie.vote_average.toFixed(1)} / 10`}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon
                key={i}
                size={13}
                className={i < Math.round(movie.vote_average / 2) ? "" : "opacity-25"}
              />
            ))}
          </p>
          <p className="mt-0.5 text-muted">
            {t("post.overview.rating")} ·{" "}
            {t("common.votes", { n: formatNumber(movie.vote_count, locale) })}
          </p>
        </div>
      </div>
      {match !== null && (
        <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
          {t("match.percent", { n: match })}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {movie.genres.map((g) => (
          <span key={g.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">
            {g.name}
          </span>
        ))}
        {runtime && (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">{runtime}</span>
        )}
      </div>
    </div>
  );
}

function renderPost(
  post: MoviePost,
  ctx: MovieProfileContext,
  t: TFunction,
  locale: Locale,
): ReactNode {
  const { movie } = ctx;
  const author = movie.title;
  const avatar = <MovieAvatar movie={movie} />;
  const regionName = new Intl.DisplayNames([locale], { type: "region" });

  switch (post.kind) {
    case "overview":
      return (
        <PostCard
          pinned
          avatar={avatar}
          author={author}
          verified
          action={t("post.overview.action")}
          time={formatYear(movie.release_date)}
          media={
            post.image && (
              <button
                type="button"
                onClick={() => {
                  ctx.openMedia(`img-${post.image}`);
                }}
                aria-label={t("media.viewPhoto")}
                className="block aspect-video w-full overflow-hidden bg-surface-2"
              >
                <img
                  src={tmdbImage(post.image, "w1280")}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition hover:scale-[1.02]"
                />
              </button>
            )
          }
          footer={<RatingSummary movie={movie} />}
        >
          <ExpandableText text={movie.overview} lines={4} className="text-[15px]" />
        </PostCard>
      );
    case "tagline":
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={t("post.tagline.action")}
          media={<HighlightCard tone={toneFor(movie.id)} size="lg" title={`“${post.text}”`} />}
        />
      );
    case "countdown":
      return (
        <PostCard
          pinned
          avatar={avatar}
          author={author}
          verified
          action={t("post.countdown.action")}
          time={<TimeLabel date={post.date} locale={locale} />}
          media={
            <HighlightCard
              tone="ocean"
              icon={<Clapperboard className="size-10" strokeWidth={1.5} />}
              eyebrow={t("post.countdown.until")}
              title={t("post.countdown.days", { n: post.days })}
              subtitle={formatDate(post.date, locale)}
            />
          }
        />
      );
    case "release": {
      const meta = RELEASE[post.release.type];
      const country = regionName.of(post.country) ?? post.country;
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={t(meta.action, { country })}
          time={<TimeLabel date={post.date} locale={locale} />}
          media={
            <HighlightCard
              tone={meta.tone}
              icon={flag(post.country)}
              eyebrow={t(meta.label)}
              title={country}
              subtitle={formatDate(post.date, locale)}
            >
              {(post.release.certification || post.release.note) && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                  {post.release.certification && (
                    <span className="rounded-md border border-white/60 px-2 py-0.5 font-bold">
                      {post.release.certification}
                    </span>
                  )}
                  {post.release.note && <span className="text-white/85">{post.release.note}</span>}
                </div>
              )}
            </HighlightCard>
          }
        />
      );
    }
    case "episode": {
      const ep = post.episode;
      const code = t("tv.episodeCode", { s: ep.season_number, e: ep.episode_number });
      if (post.variant === "next") {
        return (
          <PostCard
            pinned
            avatar={avatar}
            author={author}
            verified
            action={t("post.tv.next")}
            time={<TimeLabel date={post.date} locale={locale} />}
            media={
              <HighlightCard
                tone="ocean"
                icon={<Tv className="size-10" strokeWidth={1.5} />}
                eyebrow={`${t("tv.nextEpisode")} · ${code}`}
                title={ep.name || code}
                subtitle={`${formatDate(post.date, locale)} · ${post.days > 0 ? t("post.tv.inDays", { n: post.days }) : t("post.tv.today")}`}
              />
            }
          />
        );
      }
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={t("post.tv.last")}
          time={<TimeLabel date={post.date} locale={locale} />}
          media={
            ep.still_path && (
              <Link
                to={`seasons/${ep.season_number}`}
                className="relative block aspect-video overflow-hidden bg-surface-2"
              >
                <img
                  src={tmdbImage(ep.still_path, "w1280")}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition hover:scale-[1.02]"
                />
                <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
                  {code}
                </span>
              </Link>
            )
          }
          footer={
            <Link
              to={`seasons/${ep.season_number}`}
              className="font-semibold text-muted hover:text-fg hover:underline"
            >
              {t("tv.season", { n: ep.season_number })} →
            </Link>
          }
        >
          <p className="font-bold">
            {ep.name}
            {ep.vote_average > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-semibold text-muted">
                <StarIcon size={11} className="text-warning" /> {ep.vote_average.toFixed(1)}
              </span>
            )}
          </p>
          {ep.overview && (
            <ExpandableText text={ep.overview} lines={3} className="mt-1 text-fg/85" />
          )}
        </PostCard>
      );
    }
    case "season": {
      const se = post.season;
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={
            post.isFirst ? t("post.tv.premiere") : t("post.tv.seasonPremiere", { season: se.name })
          }
          time={<TimeLabel date={post.date} locale={locale} />}
        >
          <Link
            to={`seasons/${se.season_number}`}
            className="flex gap-4 rounded-lg bg-surface-2 p-3 transition hover:bg-border"
          >
            <div className="w-24 shrink-0 overflow-hidden rounded-md bg-surface sm:w-28">
              {(se.poster_path ?? movie.poster_path) && (
                <img
                  src={tmdbImage(se.poster_path ?? movie.poster_path, "w342")}
                  alt=""
                  loading="lazy"
                  className="aspect-[2/3] w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 py-1">
              <p className="text-lg font-black leading-tight">{se.name}</p>
              <p className="mt-1 text-sm text-muted">
                {formatYear(se.air_date)} · {t("tv.episodes", { n: se.episode_count })}
                {se.vote_average > 0 && ` · ★ ${se.vote_average.toFixed(1)}`}
              </p>
              {se.overview && <p className="mt-2 line-clamp-3 text-sm text-fg/85">{se.overview}</p>}
            </div>
          </Link>
        </PostCard>
      );
    }
    case "ended":
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={t("post.tv.ended")}
          time={<TimeLabel date={post.date} locale={locale} />}
          media={
            <HighlightCard
              tone="night"
              icon={<Clapperboard className="size-10" strokeWidth={1.5} />}
              eyebrow={t("tv.ended")}
              title={t("post.tv.endedTitle", { seasons: post.seasons })}
              subtitle={t("tv.episodes", { n: post.episodes })}
            />
          }
        />
      );
    case "video":
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={t("post.video.action", { type: post.video.type })}
          time={<TimeLabel date={post.date} locale={locale} />}
          media={<TrailerPlayer video={post.video} onPlay={ctx.recordVideoPlay} />}
          footer={
            <Link to="videos" className="font-semibold text-muted hover:text-fg hover:underline">
              {t("post.video.seeAll")} →
            </Link>
          }
        >
          <p className="font-medium">{post.video.name}</p>
        </PostCard>
      );
    case "review": {
      const r = post.review;
      const avatarUrl = reviewerAvatar(r.author_details.avatar_path);
      return (
        <PostCard
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
          action={t("post.review.action", { title: movie.title })}
          time={<TimeLabel date={post.date} locale={locale} />}
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
          <ExpandableText text={r.content} lines={6} />
        </PostCard>
      );
    }
    case "photos": {
      const types = (["backdrops", "posters", "logos"] as const).filter((k) => post.counts[k] > 0);
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={t("post.photos.action", { n: post.total })}
          media={
            <MixedPhotoCollage
              backdrops={post.backdrops.map((i) => i.file_path)}
              posters={post.posters.map((i) => i.file_path)}
              total={post.total}
              onOpen={(path) => {
                ctx.openMedia(`img-${path}`);
              }}
            />
          }
          footer={
            // open the viewer at the matching image group
            <div className="flex flex-wrap gap-2">
              {types.map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => {
                    const first = ctx.movie.images[k][0];
                    if (first) ctx.openMedia(`img-${first.file_path}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold hover:bg-border"
                >
                  {t(PHOTO_LABEL[k])}
                  <span className="text-muted">{post.counts[k]}</span>
                </button>
              ))}
            </div>
          }
        />
      );
    }
    case "keywords": {
      const tag = (name: string) => `#${name.replace(/\s+/g, "_")}`;
      const [first, ...rest] = post.keywords;
      return (
        <PostCard
          avatar={avatar}
          author={author}
          verified
          action={t("post.keywords.action")}
          media={
            <HighlightCard
              tone={toneFor(movie.id + 3)}
              eyebrow={t("post.keywords.eyebrow")}
              title={
                first && (
                  <Link to={keywordHref(first.id, movie.media_type)} className="hover:underline">
                    {tag(first.name)}
                  </Link>
                )
              }
            >
              <div className="flex max-w-md flex-wrap justify-center gap-1.5">
                {rest.map((k) => (
                  <Link
                    key={k.id}
                    to={keywordHref(k.id, movie.media_type)}
                    className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm transition hover:bg-white hover:text-black"
                  >
                    {tag(k.name)}
                  </Link>
                ))}
              </div>
            </HighlightCard>
          }
        />
      );
    }
  }
}

/** Default tab: "About" on the left, the timeline on the right (like a Facebook profile). */
export function TimelineTab() {
  const t = useT();
  const ctx = useMovieProfile();
  const locale = usePreferences((s) => s.locale);
  const region = usePreferences((s) => s.region);
  const reviews = useMediaReviews(ctx.movie.media_type ?? "movie", ctx.movie.id);
  const [now] = useState(() => new Date());
  const [asideRef, asideStyle] = useStickySidebar<HTMLElement>(STICKY_OFFSET);

  const posts = useMemo(
    () => buildMovieTimeline(ctx.movie, reviews.data?.pages[0]?.results ?? [], { region, now }),
    [ctx.movie, reviews.data, region, now],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside ref={asideRef} style={asideStyle} className="min-w-0 lg:sticky lg:self-start">
        <MovieIntro />
      </aside>
      <div className="min-w-0 space-y-4">
        {posts.length === 0 && !reviews.isPending ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            {t("profile.noPosts")}
          </p>
        ) : (
          posts.map((p) => <div key={p.id}>{renderPost(p, ctx, t, locale)}</div>)
        )}
        {reviews.isPending && <div className="h-32 animate-pulse rounded-xl bg-surface" />}
      </div>
    </div>
  );
}
