import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether `query` matches the viewport, or `undefined` while that is unknown: on the server, in
 * the first hydration pass and wherever `window.matchMedia` does not exist. A caller renders
 * its unresolved presentation for `undefined` instead of guessing a width.
 */
export function useMediaQuery(query: string): boolean | undefined {
  // Both functions are stable per `query`: `useSyncExternalStore` resubscribes whenever
  // `subscribe` changes identity, so a fresh closure per render would drop and re-add the
  // `change` listener on every re-render.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : undefined), [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getServerSnapshot(): undefined {
  return undefined;
}
