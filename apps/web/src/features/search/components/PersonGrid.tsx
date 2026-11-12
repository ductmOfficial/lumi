import { Link } from "react-router";
import { tmdbImage } from "@/lib/tmdb";
import { personHref } from "@/lib/slug";
import { useT } from "@/i18n/useT";
import { UserIcon } from "@/components/icons";
import { departmentLabel } from "@/features/people/departments";
import type { PersonResult } from "../api/queries";

/** People results grid: round photo, name, main department, a few known-for titles */
export function PersonGrid({ people }: { people: PersonResult[] }) {
  const t = useT();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
      {people.map((p) => {
        const known = (p.known_for ?? [])
          .map((k) => k.title ?? k.name)
          .filter(Boolean)
          .slice(0, 2)
          .join(" · ");
        return (
          <li key={p.id}>
            <Link
              to={personHref(p)}
              className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-accent"
            >
              <span className="size-24 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-2 ring-transparent transition group-hover:ring-accent sm:size-28">
                {p.profile_path ? (
                  <img
                    src={tmdbImage(p.profile_path, "w185")}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-muted">
                    <UserIcon size={36} />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 font-semibold leading-snug group-hover:underline">
                  {p.name}
                </span>
                {p.known_for_department && (
                  <span className="block text-xs text-accent">
                    {departmentLabel(p.known_for_department, t)}
                  </span>
                )}
                {known && (
                  <span className="mt-1 line-clamp-2 block text-xs text-muted">{known}</span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PersonGridSkeleton() {
  return (
    <ul className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 12 }, (_, i) => (
        <li
          key={i}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4"
        >
          <span className="size-24 rounded-full bg-surface-2 sm:size-28" />
          <span className="h-4 w-3/4 rounded bg-surface-2" />
          <span className="h-3 w-1/2 rounded bg-surface-2" />
        </li>
      ))}
    </ul>
  );
}
