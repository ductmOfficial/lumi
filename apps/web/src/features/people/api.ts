import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  normalizeTvSummary,
  tmdbFetch,
  type MovieSummary,
  type PersonDetail,
  type PersonMovieCast,
  type PersonMovieCrew,
  type RawTvSummary,
} from "@/lib/tmdb";
import { useTmdbLocale } from "@/stores/preferences";

type RawCredit = (MovieSummary | (RawTvSummary & { media_type: "tv" })) & {
  media_type: "movie" | "tv";
  character?: string;
  job?: string;
  department?: string;
  credit_id: string;
};
interface RawPerson extends Omit<PersonDetail, "movie_credits"> {
  combined_credits: { cast: RawCredit[]; crew: RawCredit[] };
}

const NOISE_GENRES = new Set([10767, 10763]); // Talk, News
const SELF = /\b(self|himself|herself|themselves|host)\b/i;
function keepCredit(c: RawCredit) {
  if (c.media_type !== "tv") return true;
  if (c.genre_ids?.some((g) => NOISE_GENRES.has(g))) return false;
  return !(c.character && SELF.test(c.character));
}
function toSummary(c: RawCredit): MovieSummary {
  return c.media_type === "tv"
    ? normalizeTvSummary(c as RawTvSummary)
    : { ...(c as MovieSummary), media_type: undefined };
}

export type { PersonMovieCast, PersonMovieCrew };

export function personQuery(id: number, language: string) {
  return queryOptions({
    queryKey: ["person", id, language] as const,
    queryFn: async ({ signal }) => {
      const raw = await tmdbFetch<RawPerson>(
        `/person/${id}`,
        { language, append_to_response: "combined_credits,images,external_ids" },
        signal,
      );
      const { combined_credits, ...rest } = raw;
      // merge movies + series into one shape; drop talk shows / news / "self" roles to reduce noise
      const person: PersonDetail = {
        ...rest,
        movie_credits: {
          cast: combined_credits.cast.filter(keepCredit).map((c) => ({
            ...toSummary(c),
            character: c.character ?? "",
            credit_id: c.credit_id,
          })),
          crew: combined_credits.crew.filter(keepCredit).map((c) => ({
            ...toSummary(c),
            job: c.job ?? "",
            department: c.department ?? "",
            credit_id: c.credit_id,
          })),
        },
      };
      // biographies are usually English-only
      if (!person.biography && !language.startsWith("en")) {
        const en = await tmdbFetch<Pick<PersonDetail, "biography">>(
          `/person/${id}`,
          { language: "en-US" },
          signal,
        );
        person.biography = en.biography;
      }
      return person;
    },
  });
}

export function usePerson(id: number) {
  const { language } = useTmdbLocale();
  return useQuery({ ...personQuery(id, language), enabled: Number.isFinite(id) && id > 0 });
}
