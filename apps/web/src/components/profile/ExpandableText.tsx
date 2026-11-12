import { useState } from "react";
import clsx from "clsx";
import { useT } from "@/i18n/useT";

/** Long paragraph: collapsed to N lines + a "See more" button. */
export function ExpandableText({
  text,
  lines = 4,
  className,
}: {
  text: string;
  lines?: 3 | 4 | 6 | 8;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const clamp = { 3: "line-clamp-3", 4: "line-clamp-4", 6: "line-clamp-6", 8: "line-clamp-[8]" }[
    lines
  ];
  const long = text.length > lines * 90;
  return (
    <div className={className}>
      <p className={clsx("whitespace-pre-line", !open && long && clamp)}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
          }}
          className="mt-1 text-sm font-semibold text-muted hover:text-fg hover:underline"
        >
          {open ? t("common.showLess") : t("common.showMore")}
        </button>
      )}
    </div>
  );
}
