import type { ChartRow, ChartZoom } from "../types.js";

/** Keeps the rows whose x value falls within `zoom`, inclusive; a row without a numeric x value is dropped. */
export function rowsInZoom(data: readonly ChartRow[], xKey: string, zoom: ChartZoom): ChartRow[] {
  return data.filter((row) => {
    const x = row[xKey];
    return typeof x === "number" && x >= zoom.start && x <= zoom.end;
  });
}
