/**
 * How `Pagination` and the components that page through it read a page size, an item count and a
 * page. Both sides read through these functions, so the page a table draws and the page its bar
 * shows cannot disagree.
 */

/** A positive whole page size. Anything else — zero, negative, fractional below one, `NaN`,
 * infinite — reads as `1`, so every division below stays finite. */
export function toPageSize(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

/** A whole, non-negative item count. */
export function toTotal(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** `value` floored into `1..pageCount`. `NaN` reads as `1`. */
export function clampPage(value: number, pageCount: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(Math.max(Math.floor(value), 1), pageCount);
}
