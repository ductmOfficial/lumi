import { useOutletContext } from "react-router";
import type { PersonDetail } from "@/lib/tmdb";
import type { PersonCredit } from "../credits";

export interface PersonProfileContext {
  person: PersonDetail;
  credits: PersonCredit[];
  /** ids of titles the user watched that feature this person ("mutual friends") */
  /** mediaKeys of movies/series the user watched that feature this person */
  mutualIds: Set<string>;
  /** open the photo viewer at the image with this file_path */
  openPhoto: (path: string) => void;
}

export const usePersonProfile = () => useOutletContext<PersonProfileContext>();
