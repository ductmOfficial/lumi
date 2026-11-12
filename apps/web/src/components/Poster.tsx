import { useState } from "react";
import clsx from "clsx";
import { tmdbImage, tmdbSrcSet } from "@/lib/tmdb";

interface PosterProps {
  path: string | null | undefined;
  alt: string;
  className?: string;
  /** Display size hint for srcset. */
  sizes?: string;
  priority?: boolean;
}

export function Poster({
  path,
  alt,
  className,
  sizes = "(min-width: 1024px) 200px, 40vw",
  priority,
}: PosterProps) {
  const [failed, setFailed] = useState(false);
  const src = tmdbImage(path, "w342");

  return (
    <div
      className={clsx("relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2", className)}
    >
      {src && !failed ? (
        <img
          src={src}
          srcSet={tmdbSrcSet(path, ["w185", "w342", "w500"])}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => {
            setFailed(true);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-muted">
          {alt}
        </div>
      )}
    </div>
  );
}
