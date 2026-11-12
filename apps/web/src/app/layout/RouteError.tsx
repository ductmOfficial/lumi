import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { useT } from "@/i18n/useT";
import { ErrorState } from "@/components/ErrorState";

export function RouteError() {
  const error = useRouteError();
  const t = useT();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-20 text-center">
      {notFound ? <p className="text-lg">{t("common.notFound")}</p> : <ErrorState error={error} />}
      <Link to="/" className="inline-block text-accent hover:underline">
        ← {t("common.backHome")}
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-20 text-center">
      <p className="text-5xl font-black text-muted">404</p>
      <p className="text-lg">{t("common.notFound")}</p>
      <Link to="/" className="inline-block text-accent hover:underline">
        ← {t("common.backHome")}
      </Link>
    </div>
  );
}
