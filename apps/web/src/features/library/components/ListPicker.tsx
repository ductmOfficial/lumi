import { useState, type SubmitEvent } from "react";
import { Check, Plus } from "lucide-react";
import clsx from "clsx";
import { mediaKey } from "@/lib/slug";
import { useT } from "@/i18n/useT";
import { toast } from "@/stores/toast";
import type { MovieLite } from "@/features/personalization/types";
import { useLibrary } from "../store";

/** Custom-list picker for a title: toggle each list + create a new list */
export function ListPicker({ movie }: { movie: MovieLite }) {
  const t = useT();
  const lists = useLibrary((s) => s.lists);
  const toggleInList = useLibrary((s) => s.toggleInList);
  const createList = useLibrary((s) => s.createList);
  const [name, setName] = useState("");
  const key = mediaKey(movie);

  const onCreate = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    createList(name, movie);
    toast(t("lib.addedToList", { name: name.trim() }));
    setName("");
  };

  return (
    <div className="w-64 space-y-2">
      <p className="font-semibold">{t("lib.addToMyList")}</p>
      {lists.length > 0 && (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {lists.map((l) => {
            const has = l.items.some((i) => mediaKey(i) === key);
            return (
              <li key={l.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={has}
                  onClick={() => {
                    const added = toggleInList(l.id, movie);
                    toast(t(added ? "lib.addedToList" : "lib.removedFromList", { name: l.name }));
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                >
                  <span
                    className={clsx(
                      "grid size-5 shrink-0 place-items-center rounded-md border",
                      has ? "border-accent bg-accent text-accent-fg" : "border-border",
                    )}
                  >
                    {has && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className="text-xs text-muted">{l.items.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={onCreate} className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder={t("lib.newListPlaceholder")}
          aria-label={t("lib.newList")}
          maxLength={60}
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          aria-label={t("lib.createList")}
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}
