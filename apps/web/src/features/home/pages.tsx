import { PageMeta } from "@/components/PageMeta";
import { useT } from "@/i18n/useT";
import { HomeFeed } from "./HomeFeed";

export function HomePage() {
  return (
    <>
      <PageMeta />
      <HomeFeed scope="all" />
    </>
  );
}

export function MoviesHomePage() {
  const t = useT();
  return (
    <>
      <PageMeta title={t("nav.movies")} />
      <HomeFeed scope="movie" />
    </>
  );
}

export function SeriesHomePage() {
  const t = useT();
  return (
    <>
      <PageMeta title={t("nav.series")} />
      <HomeFeed scope="tv" />
    </>
  );
}
