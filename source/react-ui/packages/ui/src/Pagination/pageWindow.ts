/**
 * One slot of a pagination bar: a numbered page, or an ellipsis standing in for a run of hidden
 * pages. An ellipsis's `side` tells the two apart, so a renderer can key each one uniquely.
 */
export type PageItem = { kind: "page"; page: number } | { kind: "ellipsis"; side: "start" | "end" };

/** Floors `value` and clamps it into `min..max`. `NaN` reads as `min`. */
function clampInteger(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function pageRange(from: number, to: number): PageItem[] {
  const items: PageItem[] = [];
  for (let page = from; page <= to; page += 1) items.push({ kind: "page", page });
  return items;
}

/**
 * The slots a pagination bar shows for `page` of `pageCount`: the first and last page always,
 * `siblings` pages on each side of the current one, and an ellipsis for each run of hidden pages.
 *
 * The bar holds `siblings * 2 + 5` slots — first, last, current, its siblings, and one
 * ellipsis-or-page slot on each side. When `pageCount` fits in that, every page is returned and
 * no ellipsis. Otherwise exactly that many slots are returned whatever `page` is, so the bar
 * keeps its length as the user moves through it: an ellipsis that would hide a single page shows
 * that page instead, and the window of numbered pages widens on the side away from an edge to
 * fill the slot the absent ellipsis leaves.
 *
 * `pageCount` is expected to be an integer; below 1 there are no pages and the result is empty.
 * `page` is floored and clamped into `1..pageCount`, and `siblings` is floored and clamped to at
 * least 0, so every page returned is in range and appears once.
 */
export function pageWindow(page: number, pageCount: number, siblings: number): PageItem[] {
  if (!(pageCount >= 1)) return [];

  const current = clampInteger(page, 1, pageCount);
  const around = clampInteger(siblings, 0, Number.POSITIVE_INFINITY);
  const slots = around * 2 + 5;
  if (pageCount <= slots) return pageRange(1, pageCount);

  const first = Math.max(current - around, 1);
  const last = Math.min(current + around, pageCount);
  // An ellipsis replaces two or more hidden pages; a gap of one page shows the page itself.
  const startEllipsis = first > 3;
  const endEllipsis = last < pageCount - 2;
  // The window spans `around * 2 + 3` numbered pages when it touches an edge.
  const edgeRun = around * 2 + 3;

  // With `pageCount > slots`, the window cannot reach within one page of both edges at once, so
  // at least one of the ellipses is always present.
  if (!startEllipsis) {
    return [...pageRange(1, edgeRun), { kind: "ellipsis", side: "end" }, { kind: "page", page: pageCount }];
  }
  if (!endEllipsis) {
    return [{ kind: "page", page: 1 }, { kind: "ellipsis", side: "start" }, ...pageRange(pageCount - edgeRun + 1, pageCount)];
  }
  return [
    { kind: "page", page: 1 },
    { kind: "ellipsis", side: "start" },
    ...pageRange(first, last),
    { kind: "ellipsis", side: "end" },
    { kind: "page", page: pageCount },
  ];
}
