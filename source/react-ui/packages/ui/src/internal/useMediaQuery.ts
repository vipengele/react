import { useSyncExternalStore } from "react";

/**
 * Whether `query` matches the viewport, or `undefined` while that is unknown: on the server, in
 * the first hydration pass and wherever `window.matchMedia` does not exist. A caller renders
 * its unresolved presentation for `undefined` instead of guessing a width.
 */
export function useMediaQuery(query: string): boolean | undefined {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : undefined),
    () => undefined,
  );
}
