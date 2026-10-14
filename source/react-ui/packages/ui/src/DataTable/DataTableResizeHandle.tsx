import { type KeyboardEvent, type PointerEvent, useRef } from "react";

/** How many pixels an arrow key resizes a column by. */
export const RESIZE_STEP = 10;

/** How many pixels an arrow key resizes a column by while Shift is held. */
export const RESIZE_LARGE_STEP = 50;

/** The handle's own name, which its accessible name puts before the column header's. */
export const RESIZE_HANDLE_LABEL = "Resize";

/**
 * The handle's `aria-valuemax` for a column with no upper bound. Without one, assistive technology
 * reads the separator's maximum as `100` and clamps the value it announces to it.
 */
export const UNBOUNDED_VALUE_MAX = Number.MAX_SAFE_INTEGER;

export interface DataTableResizeHandleProps {
  columnId: string;
  /** The id of the element holding the column header's content, which names the handle. */
  labelId: string;
  /** The width the column is drawn at, in pixels. */
  width: number;
  minSize: number;
  /** `Infinity` when the column sets no upper bound. */
  maxSize: number;
  /** Called with the width the column is resized to, before it is clamped into its bounds. */
  onResize: (columnId: string, size: number) => void;
}

interface Drag {
  pointerId: number;
  /** The pointer's `clientX` when the drag started. */
  origin: number;
  /** The column's drawn width when the drag started. */
  startWidth: number;
  /** `1` when the column's trailing edge is its right edge, `-1` in a right-to-left table. */
  sign: 1 | -1;
}

function isRtl(element: Element): boolean {
  return getComputedStyle(element).direction === "rtl";
}

/**
 * The width a key resizes the column to from `width`, or `undefined` for a key the handle does not
 * take. The arrow toward the column's trailing edge widens it and the other narrows it, by
 * `RESIZE_STEP`, or `RESIZE_LARGE_STEP` with Shift; Home goes to `minSize` and End to `maxSize`,
 * which a column with no upper bound has no width for.
 */
function keyedWidth(event: KeyboardEvent<HTMLElement>, width: number, { minSize, maxSize }: { minSize: number; maxSize: number }) {
  const step = event.shiftKey ? RESIZE_LARGE_STEP : RESIZE_STEP;
  const widen = isRtl(event.currentTarget) ? "ArrowLeft" : "ArrowRight";
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowRight":
      return event.key === widen ? width + step : width - step;
    case "Home":
      return minSize;
    case "End":
      return Number.isFinite(maxSize) ? maxSize : undefined;
    default:
      return undefined;
  }
}

/**
 * The resize handle on a column header's trailing edge: a focusable vertical `separator` whose
 * value is the column's drawn width in whole pixels, between its `minSize` and its `maxSize`, or
 * `UNBOUNDED_VALUE_MAX` for a column with none. It is named by `RESIZE_HANDLE_LABEL` followed by
 * the header's content.
 *
 * Dragging it with a pointer resizes the column live: the pointer is captured, so the drag
 * follows it wherever it goes until it is released, cancelled or loses its capture, and every
 * move resizes the column to the width it had when the drag started plus the distance moved
 * toward its trailing edge, in whole pixels. A press with any mouse button but the main one
 * starts no drag. From the keyboard, the arrow toward the trailing edge (Right, or Left in a
 * right-to-left table) widens the column by `RESIZE_STEP` and the other narrows it, Shift making
 * the step `RESIZE_LARGE_STEP`; Home resizes it to its `minSize`, and End to its `maxSize`, doing
 * nothing for a column with no upper bound. A key it takes goes no further than the handle.
 *
 * The handle sits beside the header's sort button, never inside it, so neither a drag nor a key
 * on it sorts.
 */
export function DataTableResizeHandle({ columnId, labelId, width, minSize, maxSize, onResize }: DataTableResizeHandleProps) {
  const drag = useRef<Drag | null>(null);
  const handleId = `${labelId}-resize`;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (drag.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    const element = event.currentTarget;
    drag.current = { pointerId: event.pointerId, origin: event.clientX, startWidth: width, sign: isRtl(element) ? -1 : 1 };
    element.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    onResize(columnId, Math.round(current.startWidth + (event.clientX - current.origin) * current.sign));
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = keyedWidth(event, width, { minSize, maxSize });
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    onResize(columnId, next);
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: an `<hr>` is not focusable and takes no children or value; a focusable separator is the ARIA window-splitter pattern
    <div
      id={handleId}
      role="separator"
      tabIndex={0}
      className="vpg-data-table-resize-handle"
      aria-orientation="vertical"
      aria-label={RESIZE_HANDLE_LABEL}
      aria-labelledby={`${handleId} ${labelId}`}
      aria-valuenow={Math.round(width)}
      aria-valuemin={Math.round(minSize)}
      aria-valuemax={Number.isFinite(maxSize) ? Math.round(maxSize) : UNBOUNDED_VALUE_MAX}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onKeyDown={handleKeyDown}
    />
  );
}
