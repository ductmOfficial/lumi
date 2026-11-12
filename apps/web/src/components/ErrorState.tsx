import clsx from "clsx";
import { MissingTokenError, TmdbError } from "@/lib/tmdb";
import { useT } from "@/i18n/useT";

export function ErrorState({
  error,
  onRetry,
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const missingToken = error instanceof MissingTokenError;
  const message = missingToken
    ? t("error.missingToken")
    : error instanceof TmdbError
      ? `${t("common.error")} (${error.status}: ${error.message})`
      : t("common.error");

  return (
    <div
      role="alert"
      className={clsx(
        "rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-200",
        compact ? "p-3" : "p-6 text-center",
      )}
    >
      <p>{message}</p>
      {onRetry && !missingToken && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md bg-red-500/20 px-3 py-1 font-medium hover:bg-red-500/30"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
