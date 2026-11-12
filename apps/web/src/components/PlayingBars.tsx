import clsx from "clsx";

/**
 * "Now playing" icon: 3 bars bouncing like an equalizer.
 * paused: static (video selected but not playing). No motion when the user prefers reduced motion.
 */
export function PlayingBars({ paused, className }: { paused?: boolean; className?: string }) {
  return (
    <span aria-hidden className={clsx("flex h-4 items-end gap-[3px]", className)}>
      {[0, 0.25, 0.5].map((delay) => (
        <span
          key={delay}
          className={clsx(
            "h-full w-[3px] origin-bottom rounded-full bg-current",
            paused
              ? "scale-y-60"
              : "animate-eq motion-reduce:animate-none motion-reduce:scale-y-60",
          )}
          style={{ animationDelay: `-${delay}s` }}
        />
      ))}
    </span>
  );
}
