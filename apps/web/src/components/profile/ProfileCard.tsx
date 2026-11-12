import type { ReactNode } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { useT } from "@/i18n/useT";

/** Rounded white card like Facebook's "Intro", "Photos", "Friends" blocks. */
export function ProfileCard({
  title,
  subtitle,
  seeAllTo,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  seeAllTo?: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <section className={clsx("rounded-xl border border-border bg-surface p-4", className)}>
      {(!!title || !!seeAllTo) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {!!title && <h2 className="text-lg font-bold">{title}</h2>}
            {!!subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {seeAllTo && (
            <Link
              to={seeAllTo}
              className="shrink-0 rounded-md px-2 py-1 text-sm text-accent hover:bg-surface-2"
            >
              {t("common.seeAll")}
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Info row with an icon in the About card. */
export function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
