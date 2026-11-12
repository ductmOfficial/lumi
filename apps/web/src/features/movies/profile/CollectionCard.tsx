import { useState } from "react";
import { Library } from "lucide-react";
import { Link } from "react-router";
import clsx from "clsx";
import { tmdbImage, type MovieDetail, type MovieSummary } from "@/lib/tmdb";
import { movieHref } from "@/lib/slug";
import { formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "@/components/icons";
import { Poster } from "@/components/Poster";
import { useCollection } from "../api/queries";

/** Sort the parts by release date (no date → last). */
function sortParts(parts: MovieSummary[]) {
  return [...parts].sort((a, b) =>
    (a.release_date || "9999").localeCompare(b.release_date || "9999"),
  );
}

/**
 * Highlighted "Collection" card in the About column: banner + list of parts (current part marked)
 * + quick jumps to the previous / next part.
 */
export function CollectionCard({ movie }: { movie: MovieDetail }) {
  const t = useT();
  const info = movie.belongs_to_collection;
  const { data, isPending } = useCollection(info?.id);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  if (!info) return null;

  const parts = data ? sortParts(data.parts) : [];
  const index = parts.findIndex((p) => p.id === movie.id);
  const prev = index > 0 ? parts[index - 1] : undefined;
  const next = index >= 0 && index < parts.length - 1 ? parts[index + 1] : undefined;
  const banner = data?.backdrop_path ?? info.backdrop_path ?? movie.backdrop_path;

  return (
    <section
      id="collection"
      className="scroll-mt-32 overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="relative aspect-[21/9] bg-surface-2">
        {banner && (
          <img
            src={tmdbImage(banner, "w780")}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
            <Library aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
            {t("collection.title")}
          </p>
          <h2 className="text-lg font-black leading-tight">{data?.name ?? info.name}</h2>
          {parts.length > 0 && (
            <p className="text-xs text-white/80">
              {t("collection.count", { n: parts.length })}
              {index >= 0 && ` · ${t("collection.part", { i: index + 1, n: parts.length })}`}
            </p>
          )}
        </div>
      </div>

      <ol className="divide-y divide-border">
        {isPending
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="m-3 h-20 animate-pulse rounded-lg bg-surface-2" />
            ))
          : parts.map((p, i) => {
              const current = p.id === movie.id;
              const upcoming = !p.release_date || p.release_date > today;
              return (
                <li key={p.id}>
                  <Link
                    to={movieHref(p)}
                    aria-current={current ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 transition",
                      current ? "bg-accent/10" : "hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        current ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <Poster
                      path={p.poster_path}
                      alt={p.title}
                      sizes="64px"
                      className={clsx(
                        "w-14 shrink-0 rounded-md sm:w-16",
                        current && "ring-2 ring-accent",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={clsx(
                          "block truncate text-sm font-semibold",
                          current && "text-accent",
                        )}
                      >
                        {p.title}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        {formatYear(p.release_date)}
                        {p.vote_average > 0 && !upcoming && (
                          <span className="inline-flex items-center gap-0.5">
                            <StarIcon size={11} className="text-warning" />{" "}
                            {p.vote_average.toFixed(1)}
                          </span>
                        )}
                      </span>
                    </span>
                    {current ? (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">
                        {t("collection.current")}
                      </span>
                    ) : upcoming ? (
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {t("collection.upcoming")}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
      </ol>

      {(prev ?? next) && (
        <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
          {prev ? (
            <Link
              to={movieHref(prev)}
              className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-xs hover:bg-border"
            >
              <ChevronLeftIcon size={16} className="shrink-0" />
              <span className="min-w-0">
                <span className="block text-muted">{t("collection.prev")}</span>
                <span className="block truncate font-semibold">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={movieHref(next)}
              className="flex items-center justify-end gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-right text-xs hover:bg-border"
            >
              <span className="min-w-0">
                <span className="block text-muted">{t("collection.next")}</span>
                <span className="block truncate font-semibold">{next.title}</span>
              </span>
              <ChevronRightIcon size={16} className="shrink-0" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
