import { useSyncExternalStore } from "react";

/** The viewport width, in `rem`, below which a layout is the narrow one. A constant rather than a
 * token: a media query cannot read a custom property. */
export const NARROW_VIEWPORT_REM = 40;

/** Matches a viewport narrower than {@link NARROW_VIEWPORT_REM}. */
export const NARROW_VIEWPORT_QUERY = `(max-width: ${NARROW_VIEWPORT_REM - 0.0625}rem)`;

/**
 * Tracks whether `query` currently matches. The server snapshot is `false`, so server rendering
 * and the first client paint are the wide layout; a narrow viewport switches on the next commit.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
