import type { ReactNode } from "react";
import clsx from "clsx";
import { BadgeCheck } from "lucide-react";
import { PinIcon } from "@/components/icons";
import { useT } from "@/i18n/useT";

interface PostCardProps {
  avatar: ReactNode;
  author: ReactNode;
  /** "posted a new trailer", "premieres in Vietnam" ... */
  action?: ReactNode;
  time?: ReactNode;
  pinned?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  /** full-bleed content (image/video) */
  media?: ReactNode;
  /** the author is the official page (movie/person) — never for reviews/comments */
  verified?: boolean;
}

/** A timeline post — every post comes from real TMDB data. */
export function PostCard({
  avatar,
  author,
  action,
  time,
  pinned,
  children,
  footer,
  media,
  verified,
}: PostCardProps) {
  const t = useT();
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className={clsx("flex gap-3 p-4 pb-3", time ? "items-start" : "items-center")}>
        <div className="shrink-0">{avatar}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            <span className="font-bold">{author}</span>
            {verified && (
              <BadgeCheck
                size={16}
                strokeWidth={2.25}
                role="img"
                aria-label={t("post.verified")}
                className="-mt-0.5 ml-1 inline-block shrink-0 fill-sky-500 align-middle text-white dark:text-surface"
              >
                <title>{t("post.verified")}</title>
              </BadgeCheck>
            )}{" "}
            {!!action && <span className="text-muted">{action}</span>}
          </p>
          {!!time && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              {pinned && <PinIcon size={12} className="text-accent" />}
              {time}
            </p>
          )}
        </div>
      </header>
      {!!children && (
        <div className={clsx("px-4 text-sm leading-relaxed", !media && "pb-4")}>{children}</div>
      )}
      {!!media && <div className={clsx(children && "mt-3")}>{media}</div>}
      {!!footer && <footer className="border-t border-border px-4 py-2.5 text-sm">{footer}</footer>}
    </article>
  );
}
