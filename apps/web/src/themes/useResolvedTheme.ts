import { useSyncExternalStore } from "react";
import { usePreferences } from "@/stores/preferences";
import { resolveTheme } from "./registry";

const query = "(prefers-color-scheme: dark)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => {
    mq.removeEventListener("change", cb);
  };
};
const getSnapshot = () => window.matchMedia(query).matches;

export function useResolvedTheme() {
  const pref = usePreferences((s) => s.theme);
  const systemDark = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return resolveTheme(pref, systemDark);
}
