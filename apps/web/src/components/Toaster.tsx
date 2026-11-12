import { useEffect } from "react";
import { useToast } from "@/stores/toast";

export function Toaster() {
  const { message, id, hide } = useToast();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 2600);
    return () => {
      clearTimeout(t);
    };
  }, [message, id, hide]);

  if (!message) return null;
  return (
    <div
      key={id}
      role="status"
      className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] flex animate-fade-in justify-center px-4 sm:bottom-6"
    >
      <div className="rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg shadow-card">
        {message}
      </div>
    </div>
  );
}
