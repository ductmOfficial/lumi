import type { ImageItem, Video } from "@/lib/tmdb";

/** An item in the media viewer: an image (TMDB) or a video (YouTube). */
export type MediaItem =
  | { id: string; type: "image"; path: string; aspect: number; group: string }
  | { id: string; type: "video"; video: Video; group: string };

export const imageItems = (images: ImageItem[], group: string): MediaItem[] =>
  images.map((i) => ({
    id: `img-${i.file_path}`,
    type: "image",
    path: i.file_path,
    aspect: i.aspect_ratio,
    group,
  }));

export const videoItems = (videos: Video[], group: string): MediaItem[] =>
  videos
    .filter((v) => v.site === "YouTube")
    .map((v) => ({ id: `vid-${v.id}`, type: "video", video: v, group }));
