import clsx from "clsx";
import { useT } from "@/i18n/useT";
import type { RowLayoutChoice } from "@/stores/preferences";
import { RowsLayoutIcon, SpotlightLayoutIcon } from "./icons";

/** Row layout toggle: regular horizontal row ↔ featured (video frame + list) */
export function LayoutToggle({
  value,
  onChange,
}: {
  value: RowLayoutChoice;
  onChange: (v: RowLayoutChoice) => void;
}) {
  const t = useT();
  const options = [
    { v: "list" as const, Icon: RowsLayoutIcon, label: t("rowLayout.list") },
    { v: "spotlight" as const, Icon: SpotlightLayoutIcon, label: t("rowLayout.spotlight") },
  ];
  return (
    // no border of its own: it sits in the icon group of the row title (RowHeader)
    <div role="group" aria-label={t("rowLayout.label")} className="inline-flex gap-0.5">
      {options.map(({ v, Icon, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => {
            onChange(v);
          }}
          aria-pressed={value === v}
          aria-label={label}
          title={label}
          className={clsx(
            "grid size-7 place-items-center rounded-full transition",
            value === v ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
