import { useState } from "react";
import { ChevronLeft, Ellipsis, ListPlus, Share2 } from "lucide-react";
import { useT } from "@/i18n/useT";
import { toast } from "@/stores/toast";
import { Popover } from "@/components/Popover";
import type { MovieLite } from "@/features/personalization/types";
import { ListPicker } from "./ListPicker";
import { copyText } from "@/lib/clipboard";

const item =
  "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-left font-semibold hover:bg-surface-2";

/** "⋯" menu on the detail page: add to a custom list, compare, share */
export function MoreActions({ movie }: { movie: MovieLite }) {
  const t = useT();
  const [view, setView] = useState<"menu" | "lists">("menu");

  const share = async () => {
    const url = window.location.href;
    if ("share" in navigator) {
      try {
        await navigator.share({ title: movie.title, url });
      } catch {
        // the user cancelled
      }
      return;
    }
    await copyText(url);
    toast(t("toast.linkCopied"));
  };

  return (
    <Popover
      align="end"
      triggerLabel={t("lib.more")}
      onOpenChange={(v) => {
        if (!v) setView("menu");
      }}
      triggerClassName="inline-flex h-full items-center rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold transition hover:bg-border"
      trigger={() => <Ellipsis size={18} />}
    >
      {(close) =>
        view === "lists" ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setView("menu");
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"
            >
              <ChevronLeft size={14} /> {t("lib.back")}
            </button>
            <ListPicker movie={movie} />
          </div>
        ) : (
          <div className="w-64 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setView("lists");
              }}
              className={item}
            >
              <ListPlus size={17} className="text-accent" /> {t("lib.addToMyList")}…
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                void share();
              }}
              className={item}
            >
              <Share2 size={17} className="text-accent" /> {t("actions.share")}
            </button>
          </div>
        )
      }
    </Popover>
  );
}
