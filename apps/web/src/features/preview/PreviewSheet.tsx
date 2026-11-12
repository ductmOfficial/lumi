import { Sheet } from "@/components/Sheet";
import { usePreview } from "./store";
import { MoviePreviewContent } from "./MoviePreviewContent";

/** Quick look on mobile/tablet: long-press a card → bottom sheet. */
export function PreviewSheet() {
  const movie = usePreview((s) => s.sheet);
  const close = usePreview((s) => s.closeSheet);
  return (
    <Sheet open={!!movie} onClose={close} variant="bottom" flush>
      {movie && <MoviePreviewContent movie={movie} onNavigate={close} />}
    </Sheet>
  );
}
