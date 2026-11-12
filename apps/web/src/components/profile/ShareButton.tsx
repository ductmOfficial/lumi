import { useT } from "@/i18n/useT";
import { toast } from "@/stores/toast";
import { ShareIcon } from "@/components/icons";
import { copyText } from "@/lib/clipboard";

/** Web Share API on mobile, copies the link on desktop. */
export function ShareButton({ title }: { title: string }) {
  const t = useT();
  const onShare = async () => {
    const url = window.location.href;
    if ("share" in navigator) {
      try {
        await navigator.share({ title, url });
      } catch {
        // the user cancelled
      }
      return;
    }
    await copyText(url);
    toast(t("toast.linkCopied"));
  };
  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={t("actions.share")}
      title={t("actions.share")}
      className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold transition hover:bg-border"
    >
      <ShareIcon size={18} />
    </button>
  );
}
