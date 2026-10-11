import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { measureHidden } from "./overflowCollapse.js";

export interface UseOverflowCollapseOptions {
  /** Selects the row's items, the boxes that collapse from the end. */
  itemSelector: string;
  /** Selects the indicator standing for the hidden items. */
  indicatorSelector: string;
  /** Switches the measurement off: no observer is installed and the hidden count is zero. */
  disabled: boolean;
  /** Whatever the row's rendered content depends on beyond what the hook already reads. A change
   * re-measures the row; the value itself is never read. */
  measureKey: unknown;
}

/**
 * How many items at the end of a single-line row it has no width for, and the ref of the row they
 * are measured on. The count is zero until a layout has been read, and zero wherever there is no
 * layout to read.
 *
 * The caller renders against an attribute contract the measurement depends on:
 *
 * - `data-collapsing` on the row while it collapses, styled `flex-wrap: nowrap`.
 * - `data-hidden` on each item the count excludes, styled `display: none`.
 * - `data-measuring`, which the hook sets and removes around one synchronous read, styled so that
 *   every child of a collapsing row is back on it at its natural width (`display: inline-flex;
 *   flex: none`).
 * - The row's `column-gap` is the gap between items.
 * - The indicator is measured as it currently reads, so it stays rendered, hidden or not.
 *
 * The row's parent is the box observed for resizes, not the row: the row's own width answers the
 * collapse this hook causes, so observing it would feed every collapse back in as a resize of its
 * own. The parent's width answers what contains it and nothing else.
 *
 * `useLayoutEffect` rather than `useEffect`: React flushes a state update made from a layout
 * effect before it yields to paint, so the first frame the user sees is the collapsed row rather
 * than the full one collapsing.
 */
export function useOverflowCollapse<T extends HTMLElement>({
  itemSelector,
  indicatorSelector,
  disabled,
  measureKey,
}: UseOverflowCollapseOptions) {
  const rowRef = useRef<T>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `measureKey` is a re-measure trigger, explained on its option
  useLayoutEffect(() => {
    if (disabled) {
      // A row that stops collapsing shows every item again, whatever the last measurement of it
      // concluded.
      setHiddenCount(0);
      return;
    }
    const row = rowRef.current;
    if (row === null) {
      return;
    }
    function measure() {
      setHiddenCount(measureHidden(row as HTMLElement, itemSelector, indicatorSelector));
    }
    measure();
    const observer = new ResizeObserver(() => {
      // An observer callback runs after layout and before paint, but a React update scheduled
      // from one lands in a later task — after the paint it was meant to precede. Flushing it
      // here puts the resized container and its recollapsed row in the same frame.
      flushSync(measure);
    });
    observer.observe(row.parentElement as HTMLElement);
    return () => {
      observer.disconnect();
    };
  }, [disabled, itemSelector, indicatorSelector, measureKey]);

  return { rowRef, hiddenCount };
}
