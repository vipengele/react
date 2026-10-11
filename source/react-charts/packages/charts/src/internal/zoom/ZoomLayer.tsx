import { useEffect, useLayoutEffect, useRef } from "react";
import { usePlotArea, useXAxisInverseScale } from "recharts";
import type { ChartRow, ChartZoom } from "../types.js";
import { useZoom } from "./useZoom.js";

export interface ZoomLayerProps {
  data: readonly ChartRow[];
  onZoomChange: ((zoom: ChartZoom | null) => void) | undefined;
}

/**
 * Drag-to-zoom over the plot, rendered inside the chart so it can read the plot area and invert
 * the x scale: pointer positions become x values here and nowhere else.
 *
 * The press is heard on the whole chart surface and tested against the plot area, rather than on
 * an overlay of its own, so that a mark, an active dot or the tooltip cursor drawn over the plot
 * never swallows it. A press starts listening on the window for the moves and the release, so a
 * move that follows the press before React re-renders is not lost; a move outside the plot area,
 * `Escape` or a cancelled pointer ends the drag without reporting it.
 *
 * The listeners are attached once and read the plot and the drag handlers of the latest render
 * through a ref, so a re-render mid-drag never detaches them.
 */
export function ZoomLayer({ data, onZoomChange }: ZoomLayerProps) {
  const plot = usePlotArea();
  const invert = useXAxisInverseScale();
  const layer = useRef<SVGGElement>(null);
  const zoom = useZoom({ data, toX: (px) => Number(invert?.(px)), onZoomChange });
  const latest = useRef({ plot, zoom });

  useLayoutEffect(() => {
    latest.current = { plot, zoom };
  });

  useEffect(() => {
    const surface = layer.current?.ownerSVGElement as SVGSVGElement;
    // Converts a pointer to the chart's coordinates, or `null` outside the plot area.
    const inPlot = (event: PointerEvent) => {
      const area = latest.current.plot;
      const box = surface.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const inside = area !== undefined && x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
      return inside ? x : null;
    };
    // The pointer whose press started the drag in progress, or `null` with none. Every other
    // pointer is ignored until the drag ends, so a second finger on the plot can neither re-anchor
    // the drag nor feed it moves, a release or a cancel.
    let owner: number | null = null;
    const stop = () => {
      owner = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
    const cancel = () => {
      stop();
      latest.current.zoom.cancel();
    };
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === owner) cancel();
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== owner) return;
      stop();
      latest.current.zoom.commit();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== owner) return;
      const x = inPlot(event);
      if (x === null) cancel();
      else latest.current.zoom.move(x);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    // A press from the pointer that owns the drag re-anchors it, so a release the window never
    // heard cannot leave the chart refusing every later press.
    const onDown = (event: PointerEvent) => {
      const x = inPlot(event);
      if ((owner !== null && event.pointerId !== owner) || event.button !== 0 || x === null) return;
      stop(); // [lydite:exclude_from_mutation][the DOM ignores re-adding an attached listener, and the owner is assigned just below, so the listeners and the owner left after this press are the same either way]
      owner = event.pointerId;
      latest.current.zoom.begin(x);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKey);
    };
    surface.addEventListener("pointerdown", onDown);
    return () => {
      surface.removeEventListener("pointerdown", onDown);
      stop();
    };
  }, []);

  const { band } = zoom;
  return (
    <g ref={layer} className="vpg-chart-zoom">
      {band && plot && band.to > band.from ? (
        <rect className="vpg-chart-zoom-selection" x={band.from} y={plot.y} width={band.to - band.from} height={plot.height} />
      ) : null}
    </g>
  );
}
