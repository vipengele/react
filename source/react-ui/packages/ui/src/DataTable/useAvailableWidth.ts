import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

function pixels(value: string): number {
  return Number.parseFloat(value) || 0;
}

/**
 * The inline size of the scroll container's content box: its border box less its borders, its
 * scrollbar and its padding, which is what a `100%` table width resolves against.
 */
function contentWidth(container: HTMLElement): number {
  const style = getComputedStyle(container);
  const bordersAndScrollbar = container.offsetWidth - container.clientWidth;
  return container.getBoundingClientRect().width - bordersAndScrollbar - pixels(style.paddingLeft) - pixels(style.paddingRight);
}

/**
 * The whole pixels the data columns have between them: the scroll container's content width less
 * the selection column's, read off the header row's selection cell when the row has one, rounded
 * down so the columns never overflow the container by a fraction of a pixel.
 */
function measureAvailable(row: HTMLElement): number {
  const container = row.closest(".vpg-table-container") as HTMLElement;
  const selection = row.querySelector(":scope > .vpg-data-table-select");
  const selectionWidth = selection === null ? 0 : selection.getBoundingClientRect().width;
  return Math.max(0, Math.floor(contentWidth(container) - selectionWidth));
}

/**
 * The whole pixels a fixed-layout DataTable's data columns have between them, and the ref of the
 * header row they are measured from. The width is `0` while `enabled` is off, until a layout has
 * been read, and wherever there is no layout to read.
 *
 * A `ResizeObserver` re-reads it when the scroll container or the selection column's header cell
 * changes size. Neither box answers the widths drawn from this measurement: the container takes
 * its width from the layout around it, and the selection column never shares in a surplus, because
 * the table is never set wider than its columns. The state is set only when the
 * whole-pixel width differs from the last one set, so a re-read that finds the same width renders
 * nothing.
 *
 * The read runs in a layout effect and every observer callback flushes its update, so the first
 * frame painted, and the frame of every resize, already has the columns at their drawn widths.
 * `selectable` re-runs the effect, because the selection cell it observes comes and goes with it.
 */
export function useAvailableWidth(enabled: boolean, selectable: boolean) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const lastWidth = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `selectable` is a re-observe trigger, explained above
  useLayoutEffect(() => {
    function update(width: number) {
      if (width === lastWidth.current) return;
      lastWidth.current = width;
      setAvailableWidth(width);
    }
    const row = rowRef.current;
    if (!enabled || row === null) {
      update(0);
      return;
    }
    function measure() {
      update(measureAvailable(row as HTMLElement));
    }
    measure();
    const observer = new ResizeObserver(() => {
      // An update scheduled from an observer callback lands in a later task, after the paint it
      // was meant to precede; flushing it keeps the resize and the redrawn columns in one frame.
      flushSync(measure);
    });
    observer.observe(row.closest(".vpg-table-container") as HTMLElement);
    const selection = row.querySelector(":scope > .vpg-data-table-select");
    if (selection !== null) observer.observe(selection);
    return () => {
      observer.disconnect();
    };
  }, [enabled, selectable]);

  return { rowRef, availableWidth };
}
