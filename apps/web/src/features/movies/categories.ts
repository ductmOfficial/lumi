import type { MessageKey } from "@lumi/i18n";
import type { MovieCategory } from "./api/queries";

export const CATEGORY_LABEL: Record<MovieCategory, MessageKey> = {
  now_playing: "home.nowPlaying",
  upcoming: "home.upcoming",
  top_rated: "home.topRated",
  popular: "home.popular",
};
