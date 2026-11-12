import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * Search input synced with the URL (?q=) — shared by the header input and the large input on /search,
 * so typing in either one updates the other.
 *
 * live = true (on /search): updates the URL as you type (debounced).
 * live = false: only navigates to /search on submit.
 */
export function useSearchInput(live: boolean) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQuery = live ? (params.get("q") ?? "") : "";
  const [input, setInput] = useState(urlQuery);

  // URL → input (the other input just typed, back/forward, leaving the search page).
  // Updated during render; compared after trimming so a space being typed is not swallowed.
  const [synced, setSynced] = useState(urlQuery);
  if (synced !== urlQuery) {
    setSynced(urlQuery);
    if (input.trim() !== urlQuery) setInput(urlQuery);
  }

  // input → URL: only when this input has just produced a new debounced value.
  // (Does not rerun when the URL changes elsewhere — avoids pushing a stale value back into the URL.)
  const debounced = useDebouncedValue(input);
  const lastPushedRef = useRef(debounced);
  useEffect(() => {
    if (debounced === lastPushedRef.current) return;
    lastPushedRef.current = debounced;
    if (!live) return;
    const q = debounced.trim();
    if (q === urlQuery) return;
    const next = new URLSearchParams(params);
    if (q) next.set("q", q);
    else next.delete("q");
    void navigate({ pathname: "/search", search: next.toString() }, { replace: true });
  }, [debounced, live, urlQuery, params, navigate]);

  const submit = () => {
    const q = input.trim();
    if (!q || (live && q === urlQuery)) return;
    const next = live ? new URLSearchParams(params) : new URLSearchParams();
    next.set("q", q);
    void navigate({ pathname: "/search", search: next.toString() }, { replace: live });
  };

  return { input, setInput, urlQuery, submit };
}
