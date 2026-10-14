import { defaultRangeExtractor, type Range, useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, type Ref, type RefObject, useCallback, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { RowWindow } from "./model.js";

interface RowWindowOptions {
  virtualized: boolean;
  /** The estimated body-row height in CSS pixels. */
  rowHeight: number | undefined;
  /** The consumer's ref to the scroll container. */
  scrollRef: Ref<HTMLDivElement> | undefined;
  caption: ReactNode;
  /** The consumer's `aria-rowcount`, which the table carries while it is not windowed. */
  ariaRowCount: number | undefined;
  paginated: boolean;
  /** The page shown, its size and the count of rows across every page, read only when `paginated`. */
  pagination: { page: number; pageSize: number; totalItems: number };
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/** Whether `caption` renders a caption, by the same test `Table` makes. */
function hasCaption(caption: ReactNode): boolean {
  return caption !== undefined && caption !== null && caption !== false && caption !== "";
}

/**
 * How far below the top of the scroll container's content the body starts, in whole pixels: the
 * height of the caption and the header row above it.
 */
function bodyOffsetIn(container: HTMLElement, body: HTMLElement): number {
  return Math.round(body.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop + container.scrollTop);
}

/**
 * The body's offset in the scroll container's content while `enabled`, which the virtualizer takes
 * as its scroll margin, so the window it reckons from the scroll offset is the rows actually in
 * view below the caption and the header. It is read in a layout effect and, because a header or
 * caption that wraps changes it without a render, re-read whenever either changes size, each read
 * flushed so the window moves in the frame of the resize. `captioned` re-runs the effect, because
 * the caption it observes comes and goes with it. It is `0` until it is first read.
 */
function useBodyOffset(
  enabled: boolean,
  captioned: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  bodyRef: RefObject<HTMLTableSectionElement | null>,
): number {
  const [offset, setOffset] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `captioned` is a re-observe trigger, explained above
  useLayoutEffect(() => {
    const container = containerRef.current;
    const body = bodyRef.current;
    if (!enabled || container === null || body === null) return;
    function measure() {
      setOffset(bodyOffsetIn(container as HTMLElement, body as HTMLElement));
    }
    measure();
    const table = body.parentElement as HTMLTableElement;
    const observer = new ResizeObserver(() => {
      // An update scheduled from an observer callback lands after the paint it was meant to
      // precede; flushing it keeps the resize and the moved window in one frame.
      flushSync(measure);
    });
    for (const box of [table.tHead, table.caption]) if (box !== null) observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, [enabled, captioned, containerRef, bodyRef]);

  return offset;
}

/**
 * The window of a `virtualized` table's drawn rows: the rows mounted in and near the scroll
 * container's view, with the height of every drawn row. Nothing is windowed while no row is drawn,
 * and `rowWindow` is then `undefined`.
 *
 * `scrollRef` is the ref the scroll container takes, which also reaches the consumer's
 * `scrollRef`, and `bodyRef` the ref the body takes. `onFocusedRowChange` takes the id of the row
 * holding focus, which the window always includes. While windowed, `ariaRowCount` counts the
 * header row and every row of the whole set, `headRowIndex` is the header row's `aria-rowindex`,
 * and `firstRowIndex` is the first drawn row's; otherwise `ariaRowCount` is the consumer's and the
 * indexes are `undefined`.
 */
export function useRowWindow(
  { virtualized, rowHeight, scrollRef, caption, ariaRowCount, paginated, pagination }: RowWindowOptions,
  renderedRows: readonly { id: string }[],
  drawnIds: readonly string[],
) {
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLTableSectionElement | null>(null);
  // The container is rendered by `Table`, a child, whose ref is attached before this component's
  // layout effects run, so the virtualizer finds it on mount and the first window renders then.
  const handleScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollElementRef.current = node;
      assignRef(scrollRef, node);
    },
    [scrollRef],
  );
  const windowed = virtualized && renderedRows.length > 0;
  const bodyOffset = useBodyOffset(windowed, hasCaption(caption), scrollElementRef, bodyRef);
  const estimateSize = useCallback(() => rowHeight ?? 0, [rowHeight]);
  // Rows are keyed by id, so a measured height stays with its row when a sort or a page change
  // moves it. The key changes identity with the drawn rows, which is what makes the virtualizer
  // lay every row out again in the new order.
  const getItemKey = useCallback((index: number) => (renderedRows[index] as (typeof renderedRows)[number]).id, [renderedRows]);
  // The row holding focus is held by id, so it stays the pinned row when a sort moves it, and
  // pins nothing while it is not drawn, on another page or filtered out of `rows`. Pinning keeps
  // it mounted however far the window moves from it: unmounting it would drop focus to the body.
  const [focusedRowId, setFocusedRowId] = useState<string>();
  const pinnedIndex = focusedRowId === undefined ? -1 : drawnIds.indexOf(focusedRowId);
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (pinnedIndex !== -1 && !indexes.includes(pinnedIndex)) {
        indexes.push(pinnedIndex);
        indexes.sort((a, b) => a - b);
      }
      return indexes;
    },
    [pinnedIndex],
  );
  const virtualizer = useVirtualizer({
    count: renderedRows.length,
    enabled: windowed,
    getScrollElement: () => scrollElementRef.current,
    estimateSize,
    getItemKey,
    rangeExtractor,
    scrollMargin: bodyOffset,
  });
  // The virtualizer keeps each row's size until it is told to measure again, so a new estimate
  // reaches rows already reckoned only through `measure`. That forgets every measured height, and
  // a mounted row whose height has not changed raises no resize to be measured by again, so each
  // one is measured on the spot. `measure` reckons the rows afresh only when they are next read,
  // and a measurement re-sizes a row only when it differs from the size last reckoned for it, so
  // the rows are read at the new estimate before the mounted ones are measured against it.
  const estimatedRowHeight = useRef(rowHeight);
  useLayoutEffect(() => {
    if (estimatedRowHeight.current === rowHeight) return;
    estimatedRowHeight.current = rowHeight;
    virtualizer.measure();
    virtualizer.getVirtualItems();
    const body = bodyRef.current as HTMLTableSectionElement;
    for (const row of body.querySelectorAll<HTMLTableRowElement>(":scope > [data-index]")) virtualizer.measureElement(row);
  }, [virtualizer, rowHeight]);

  if (!windowed) {
    return {
      scrollRef: handleScrollRef,
      bodyRef,
      rowWindow: undefined,
      ariaRowCount,
      headRowIndex: undefined,
      firstRowIndex: undefined,
      onFocusedRowChange: setFocusedRowId,
    };
  }

  const rowWindow: RowWindow = {
    rows: virtualizer.getVirtualItems().map(({ index, start, end }) => ({ index, start: start - bodyOffset, end: end - bodyOffset })),
    totalSize: virtualizer.getTotalSize(),
    measureRow: virtualizer.measureElement,
  };
  // The rows drawn are one page of a `paginated` table, so the whole set counts every page's rows
  // and a drawn row's index counts the rows of the pages before.
  const pageStart = paginated ? (pagination.page - 1) * pagination.pageSize : 0;
  const rowCount = Math.max(paginated ? pagination.totalItems : renderedRows.length, pageStart + renderedRows.length);
  return {
    scrollRef: handleScrollRef,
    bodyRef,
    rowWindow,
    ariaRowCount: rowCount + 1,
    headRowIndex: 1,
    firstRowIndex: pageStart + 2,
    onFocusedRowChange: setFocusedRowId,
  };
}
