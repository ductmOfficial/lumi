import { create } from "zustand";
import type { MovieLite } from "@/features/personalization/types";

export type PreviewMovie = MovieLite & { overview?: string };

interface PreviewState {
  hover: { movie: PreviewMovie; rect: DOMRect } | null;
  sheet: PreviewMovie | null;
  showHover: (movie: PreviewMovie, rect: DOMRect) => void;
  hideHover: () => void;
  openSheet: (movie: PreviewMovie) => void;
  closeSheet: () => void;
}

export const usePreview = create<PreviewState>()((set) => ({
  hover: null,
  sheet: null,
  showHover: (movie, rect) => {
    set({ hover: { movie, rect } });
  },
  hideHover: () => {
    set({ hover: null });
  },
  openSheet: (movie) => {
    set({ sheet: movie, hover: null });
  },
  closeSheet: () => {
    set({ sheet: null });
  },
}));

// Hover-preview close timer — shared by the card and the preview so moving the mouse from card to preview keeps it open.
let hideTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleHideHover(ms = 150) {
  cancelHideHover();
  hideTimer = setTimeout(() => {
    usePreview.getState().hideHover();
  }, ms);
}
export function cancelHideHover() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
}
