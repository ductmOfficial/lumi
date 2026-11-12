import clsx from "clsx";
import { useT } from "@/i18n/useT";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { toast } from "@/stores/toast";
import { themeBySlug } from "@/features/discover/catalog";
import { useIsFollowingTopic, usePersonalization } from "../store";

/** Follow / Following button for a topic (THEMES). size sm for small cards. */
export function FollowTopicButton({
  slug,
  size = "md",
  className,
}: {
  slug: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useT();
  const following = useIsFollowingTopic(slug);
  const toggle = usePersonalization((s) => s.toggleTopic);
  const theme = themeBySlug(slug);
  if (!theme) return null;
  const name = t(theme.label);

  return (
    <button
      type="button"
      aria-pressed={following}
      title={t("topic.followHint")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const on = toggle(slug);
        toast(t(on ? "topic.followed" : "topic.unfollowed", { name }));
      }}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold transition",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        following
          ? "border-accent bg-accent text-accent-fg"
          : "border-border text-fg hover:border-fg",
        className,
      )}
    >
      {following ? (
        <CheckIcon size={size === "sm" ? 12 : 14} />
      ) : (
        <PlusIcon size={size === "sm" ? 12 : 14} />
      )}
      {following ? t("topic.following") : t("topic.follow")}
    </button>
  );
}
