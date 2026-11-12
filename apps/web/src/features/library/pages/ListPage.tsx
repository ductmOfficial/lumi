import { ConfirmButton } from "@/components/ConfirmButton";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowDown, ArrowUp, Check, ChevronLeft, Pencil, Share2, Trash2, X } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { Poster } from "@/components/Poster";
import { NotFoundPage } from "@/app/layout/RouteError";
import { mediaKey, movieHref } from "@/lib/slug";
import { formatYear } from "@/lib/format";
import { useT } from "@/i18n/useT";
import { toast } from "@/stores/toast";
import { useLibrary } from "../store";
import { shareListUrl } from "../share";
import { EmptyState } from "../components/EmptyState";
import { copyText } from "@/lib/clipboard";

const iconBtn =
  "grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent";

/** /lists/:id — one custom list: rename, reorder, remove items, share, delete */
export function ListPage() {
  const t = useT();
  const navigate = useNavigate();
  const { listId } = useParams();
  const list = useLibrary((s) => s.lists.find((l) => l.id === listId));
  const rename = useLibrary((s) => s.renameList);
  const remove = useLibrary((s) => s.deleteList);
  const move = useLibrary((s) => s.moveInList);
  const toggle = useLibrary((s) => s.toggleInList);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (!list) return <NotFoundPage />;

  const share = async () => {
    const url = shareListUrl(window.location.origin, list.name, list.items);
    if ("share" in navigator) {
      try {
        await navigator.share({ title: list.name, url });
      } catch {
        // cancelled
      }
      return;
    }
    await copyText(url);
    toast(t("lib.shareCopied"));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-8">
      <PageMeta title={list.name} />
      <Link
        to="/watchlist?tab=lists"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"
      >
        <ChevronLeft size={16} /> {t("lib.tab.lists")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              rename(list.id, name);
              setEditing(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              maxLength={60}
              aria-label={t("lib.renameList")}
              className="min-w-0 flex-1 rounded-lg border border-accent bg-surface px-3 py-1.5 text-xl font-bold focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t("lib.save")}
              className="grid size-10 place-items-center rounded-lg bg-accent text-accent-fg"
            >
              <Check size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
              }}
              aria-label={t("lib.cancel")}
              className="grid size-10 place-items-center rounded-lg bg-surface-2"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <>
            <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{list.name}</h1>
            <button
              type="button"
              onClick={() => {
                setName(list.name);
                setEditing(true);
              }}
              aria-label={t("lib.renameList")}
              title={t("lib.renameList")}
              className={iconBtn}
            >
              <Pencil size={16} />
            </button>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          disabled={!list.items.length}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40"
        >
          <Share2 size={16} /> {t("lib.shareList")}
        </button>
        <ConfirmButton
          title={t("lib.deleteList")}
          message={t("lib.deleteListConfirm", { name: list.name })}
          confirmLabel={t("lib.deleteList")}
          onConfirm={() => {
            remove(list.id);
            void navigate("/watchlist?tab=lists", { replace: true });
          }}
          className="min-h-0 gap-2 rounded-lg border-danger/50 bg-transparent px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
        >
          <Trash2 size={16} /> {t("lib.deleteList")}
        </ConfirmButton>
      </div>
      {list.items.length === 0 ? (
        <EmptyState
          icon={<Pencil size={32} />}
          title={t("lib.listEmpty")}
          hint={t("lib.listEmptyHint")}
        />
      ) : (
        <ol className="space-y-2">
          {list.items.map((m, i) => (
            <li
              key={mediaKey(m)}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-2"
            >
              <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-muted">
                {i + 1}
              </span>
              <Link to={movieHref(m)} className="shrink-0">
                <Poster
                  path={m.poster_path}
                  alt={m.title}
                  sizes="56px"
                  className="w-12 rounded-md"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={movieHref(m)} className="line-clamp-1 font-semibold hover:underline">
                  {m.title}
                </Link>
                <p className="text-xs text-muted">
                  {formatYear(m.release_date)} ·{" "}
                  {m.media_type === "tv" ? t("search.tv") : t("search.movies")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  move(list.id, i, -1);
                }}
                disabled={i === 0}
                aria-label={t("lib.moveUp")}
                className={iconBtn}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  move(list.id, i, 1);
                }}
                disabled={i === list.items.length - 1}
                aria-label={t("lib.moveDown")}
                className={iconBtn}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => toggle(list.id, m)}
                aria-label={t("lib.removeItem")}
                className={iconBtn + " hover:!text-danger"}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
