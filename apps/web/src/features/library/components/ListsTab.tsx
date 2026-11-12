import { useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import { ListPlus, Plus } from "lucide-react";
import clsx from "clsx";
import { mediaKey } from "@/lib/slug";
import { tmdbImage } from "@/lib/tmdb";
import { useT } from "@/i18n/useT";
import { useLibrary, type UserList } from "../store";
import { EmptyState } from "./EmptyState";

/** Custom lists: create + grid of list cards */
export function ListsTab() {
  const t = useT();
  const lists = useLibrary((s) => s.lists);
  const createList = useLibrary((s) => s.createList);
  const [name, setName] = useState("");
  const onCreate = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    createList(name);
    setName("");
  };
  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="flex max-w-md gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder={t("lib.newListPlaceholder")}
          aria-label={t("lib.newList")}
          maxLength={60}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40"
        >
          <Plus size={16} /> {t("lib.createList")}
        </button>
      </form>
      {lists.length === 0 ? (
        <EmptyState
          icon={<ListPlus size={36} />}
          title={t("lib.listsEmpty")}
          hint={t("lib.listsEmptyHint")}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {lists.map((l) => (
            <li key={l.id}>
              <ListCard list={l} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListCard({ list }: { list: UserList }) {
  const t = useT();
  const covers = list.items.slice(0, 4);
  return (
    <Link
      to={`/lists/${list.id}`}
      className="group block rounded-2xl border border-border bg-surface p-2 transition hover:border-accent"
    >
      {/* collage adapts to the number of titles: 1 → one image, 2–3 → two columns, 4+ → 2×2 grid */}
      <div
        className={clsx(
          "grid aspect-square gap-1 overflow-hidden rounded-xl bg-surface-2",
          covers.length >= 4
            ? "grid-cols-2 grid-rows-2"
            : covers.length >= 2
              ? "grid-cols-2"
              : "grid-cols-1",
        )}
      >
        {(covers.length >= 4 ? covers : covers.slice(0, 2)).map((m) =>
          m.poster_path ? (
            <img
              key={mediaKey(m)}
              src={tmdbImage(m.poster_path, "w342")}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span key={mediaKey(m)} className="bg-surface-2" />
          ),
        )}
      </div>
      <p className="mt-2 line-clamp-1 px-1 font-semibold group-hover:text-accent">{list.name}</p>
      <p className="px-1 text-xs text-muted">{t("lib.itemsCount", { n: list.items.length })}</p>
    </Link>
  );
}
