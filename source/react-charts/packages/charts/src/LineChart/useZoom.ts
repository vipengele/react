import { useCallback, useRef, useState } from "react";
import type { LineChartZoom } from "./LineChart.js";

/** A drag shorter than this many pixels is a press, and selects nothing. */
export const MIN_DRAG_PX = 4;

/** The horizontal pixel span a drag covers, `from <= to`, in the chart's own coordinates. */
export interface ZoomBand {
  readonly from: number;
  readonly to: number;
}

interface Drag {
  /** The dataset the drag started over; a drag over any other one is discarded. */
  readonly data: unknown;
  readonly anchor: number;
  readonly current: number;
}

export interface UseZoomOptions {
  /** The chart's dataset. A drag in progress is discarded when it changes identity. */
  data: unknown;
  /** Converts a pixel position in the chart's coordinates to an x value. */
  toX: (px: number) => number;
  onZoomChange: ((zoom: LineChartZoom | null) => void) | undefined;
}

export interface UseZoom {
  /** The span being dragged, or `null` when no drag is in progress. */
  readonly band: ZoomBand | null;
  readonly dragging: boolean;
  /** Anchors a drag at `px`. */
  begin: (px: number) => void;
  /** Moves the free end of a drag in progress to `px`. */
  move: (px: number) => void;
  /** Ends the drag, reporting its range through `onZoomChange` when it spans at least `MIN_DRAG_PX` and a non-empty x range. */
  commit: () => void;
  /** Ends the drag without reporting anything. */
  cancel: () => void;
}

/**
 * The in-progress drag selection of a controlled zoom. The committed zoom is the caller's; this
 * holds only the drag, in pixels, and reports it in x values once, on `commit`.
 *
 * The drag lives in a ref as well as in state: a release can arrive before React re-renders the
 * last move, and reading state there would report the range one move short.
 */
export function useZoom({ data, toX, onZoomChange }: UseZoomOptions): UseZoom {
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const update = useCallback((next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const begin = useCallback((px: number) => update({ data, anchor: px, current: px }), [data, update]);

  const move = useCallback(
    (px: number) => {
      const current = dragRef.current;
      if (current !== null && current.data === data) update({ ...current, current: px });
    },
    [data, update],
  );

  const cancel = useCallback(() => update(null), [update]);

  const commit = useCallback(() => {
    const current = dragRef.current;
    update(null);
    if (current === null || current.data !== data) return;
    const from = Math.min(current.anchor, current.current);
    const to = Math.max(current.anchor, current.current);
    if (to - from < MIN_DRAG_PX) return;
    const start = toX(from);
    const end = toX(to);
    if (end > start) onZoomChange?.({ start, end });
  }, [data, toX, onZoomChange, update]);

  const live = drag !== null && drag.data === data ? drag : null;
  const band = live ? { from: Math.min(live.anchor, live.current), to: Math.max(live.anchor, live.current) } : null;

  return { band, dragging: live !== null, begin, move, commit, cancel };
}
