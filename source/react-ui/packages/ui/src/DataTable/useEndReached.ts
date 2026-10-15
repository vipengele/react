import { Scope, useScope } from "@vipengele/react-telemetry";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import type { RowWindow } from "./model.js";

interface EndReachedOptions {
  /** The consumer's request for more rows; passing it, on a `virtualized` table that is not `paginated`, turns the signal on. */
  onLoadMore: (() => void) | undefined;
  hasMore: boolean | undefined;
  loadingMore: boolean | undefined;
  /** How many rows from the last row the end of the range may be and still count as near the end. */
  loadMoreThreshold: number | undefined;
  /** Why the last request failed; while any value but `null` and `undefined` is set, the signal is quiet. */
  loadMoreError: ReactNode;
  virtualized: boolean;
  /** Paging wins over `onLoadMore`: a `paginated` table never asks for more rows. */
  paginated: boolean;
  /** While the body is skeleton rows, nothing is drawn to be near the end of. */
  loading: boolean;
  /** While the window's range is reckoned from an offset the scroll container has left, it is not the rows in view. */
  scrollPending: boolean;
}

/**
 * Whether the rows in view reach within `threshold` rows of the last of `rowCount` rows. With no
 * rows there is nothing to scroll and the table is at its end. A virtualized table that is not
 * `loading` windows any rows it has, so `rowWindow` is then defined; its range is `null` while the
 * scroll container has no size, when no row is in view and so none is near the end. The range's
 * `endIndex` is the last row in view, never the last row mounted: the window also mounts the
 * overscan beyond the view, and the focused row wherever it is.
 */
function nearEnd(rowCount: number, rowWindow: RowWindow | undefined, threshold: number): boolean {
  if (rowCount === 0) return true;
  const { range } = rowWindow as RowWindow;
  return range !== null && range.endIndex >= rowCount - 1 - threshold;
}

/**
 * Calls `onLoadMore` once the rows in view come within `loadMoreThreshold` rows of the last of
 * `rows`, or at once while there are no rows, as long as the table is infinite (a `virtualized`
 * table with `onLoadMore` and not `paginated`), `hasMore` is set, and none of `loadingMore`,
 * `loading`, `loadMoreError` and `scrollPending` is. A failed request leaves the end in reach, so
 * without the `loadMoreError` hold the table would ask again at every re-arm and retry in a loop.
 *
 * The call comes from an effect, so it needs no scroll: rows that do not fill the scroll container
 * leave the end in view, and it is called again for each page appended until they do or `hasMore`
 * is `false`. It is called at most once per armed state. The table is armed again when the count
 * of rows changes, when `loadingMore` is seen set (the consumer took the request up, whether or not
 * the page it brings has rows), and when `rows` is replaced after `rearm`, which a header sort click
 * calls. The rows drawn at the click are in the order the consumer is replacing, so a request made
 * for them would extend an order already left; `rearm` alone arms nothing. Between those, every
 * other commit (a scroll within reach of the end, the window settling as rows are measured) calls
 * nothing more. The dedupe is held in a ref, which survives StrictMode's simulated remount, so the
 * remount's second run of the effect calls nothing either.
 *
 * The sort click also scrolls to the top, and the range reaches the top only with the scroll event
 * after it. Until then the range is the one at the old offset, the end perhaps among it, and
 * `scrollPending` holds every call back, however the table was armed.
 *
 * `onLoadMore` starts inside the scope `useScope()` returned at the latest render: the nearest
 * enclosing `ScopeProvider`'s, or the default scope outside any. An effect runs with no ambient
 * scope of its own in a browser, so the scope is re-entered around the call with
 * `Scope.propagate`. It is read through a ref, written by an effect declared before the one that
 * calls, because outside a provider `useScope()` returns `Scope.current()`, whose identity can
 * change from one render to the next. Only `onLoadMore`'s synchronous start is in the scope.
 *
 * `retry` calls `onLoadMore` at once, in the same scope, for the error row's Retry button, while
 * `loadMoreError` holds the effect back. It counts as the armed state's one call, so the effect asks nothing more until the
 * table is armed again, typically by the consumer setting `loadingMore` as it takes the retry up.
 */
export function useEndReached(
  {
    onLoadMore,
    hasMore = false,
    loadingMore = false,
    loadMoreThreshold = 5,
    loadMoreError,
    virtualized,
    paginated,
    loading,
    scrollPending,
  }: EndReachedOptions,
  rows: readonly unknown[],
  rowWindow: RowWindow | undefined,
) {
  const scope = useScope();
  const scopeRef = useRef(scope);
  useEffect(() => {
    scopeRef.current = scope;
  });

  const rowCount = rows.length;
  const firedRef = useRef(false);
  const seenRowCountRef = useRef(rowCount);
  // The rows drawn when `rearm` was called, until `rows` is replaced.
  const rearmedOnRef = useRef<readonly unknown[] | null>(null);
  const rearm = useCallback(() => {
    rearmedOnRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (seenRowCountRef.current !== rowCount) {
      seenRowCountRef.current = rowCount;
      firedRef.current = false;
    }
    if (rearmedOnRef.current !== null && rearmedOnRef.current !== rows) {
      rearmedOnRef.current = null;
      firedRef.current = false;
    }
    if (loadingMore) {
      firedRef.current = false;
      return;
    }
    if (onLoadMore === undefined || !virtualized || paginated || !hasMore || loading || scrollPending) return;
    if (loadMoreError !== undefined && loadMoreError !== null) return;
    if (firedRef.current || !nearEnd(rowCount, rowWindow, loadMoreThreshold)) return;
    firedRef.current = true;
    Scope.propagate(scopeRef.current, () => onLoadMore());
  });

  // Only the error row calls it, and only an infinite table, which has `onLoadMore`, draws one.
  const retry = useCallback(() => {
    firedRef.current = true;
    Scope.propagate(scopeRef.current, () => (onLoadMore as () => void)());
  }, [onLoadMore]);

  return { rearm, retry };
}
