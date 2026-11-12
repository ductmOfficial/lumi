import { useOutletContext } from "react-router";
import type { MovieDetail, Video } from "@/lib/tmdb";

export interface MovieProfileContext {
  movie: MovieDetail;
  /** open the media viewer at an item (id is `img-<path>` or `vid-<id>`) */
  openMedia: (itemId: string) => void;
  /** open the media viewer at a video */
  playVideo: (video: Video) => void;
  /** record a "watched trailer" signal (when a video plays inline) */
  recordVideoPlay: () => void;
}

export const useMovieProfile = () => useOutletContext<MovieProfileContext>();
