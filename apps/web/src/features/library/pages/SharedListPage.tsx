import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { Download, Link2 } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { MovieGrid, MovieGridSkeleton } from "@/components/MovieGrid";
import { useT } from "@/i18n/useT";
import { useTmdbLocale } from "@/stores/preferences";
import { toast } from "@/stores/toast";
import type { MovieLite } from "@/features/personalization/types";
import { liteQuery } from "../api";
import { decodeItems } from "../share";
import { useLibrary } from "../store";
import { EmptyState } from "../components/EmptyState";

/** /lists/shared?n=Name&i=m1.t2 — opens a list someone shared and saves it locally */
export function SharedListPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { language } = useTmdbLocale();
  const name = (params.get("n") ?? "").slice(0, 60) || t("lib.sharedList");
  const ids = useMemo(() => decodeItems(params.get("i")), [params]);
  const importList = useLibrary((s) => s.importList);
  const results = useQueries({ queries: ids.map((x) => liteQuery(x.type, x.id, language)) });
  const loading = results.some((r) => r.isPending);
  const items = results.flatMap((r) => (r.data ? [r.data as MovieLite] : []));

  return (
    <div className="mx-auto max-w-app space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageMeta title={name} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Link2 size={14} /> {t("lib.sharedList")}
          </p>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-muted">{t("lib.itemsCount", { n: ids.length })}</p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const id = importList(name, items);
              toast(t("lib.listSaved"));
              void navigate(`/lists/${id}`);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            <Download size={16} /> {t("lib.saveList")}
          </button>
        )}
      </div>
      {!ids.length ? (
        <EmptyState icon={<Link2 size={36} />} title={t("lib.sharedInvalid")} />
      ) : loading && !items.length ? (
        <MovieGridSkeleton />
      ) : (
        <MovieGrid movies={items} />
      )}
    </div>
  );
}
