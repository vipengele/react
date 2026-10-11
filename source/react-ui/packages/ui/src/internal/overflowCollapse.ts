/** The border-box width of every element in `row` matching `selector`, in document order. */
export function widthsOf(row: HTMLElement, selector: string): number[] {
  return Array.from(row.querySelectorAll(selector), (box) => box.getBoundingClientRect().width);
}

/** How many of `widths`, laid end to end with `gap` between each pair, stand inside `available`.
 * Counting stops at the first box that does not fit: a row shows a prefix of its boxes, so a
 * later narrow one never takes the place of an earlier wide one. */
export function countFitting(widths: number[], gap: number, available: number): number {
  let used = 0;
  let fitting = 0;
  for (const width of widths) {
    used += fitting === 0 ? width : gap + width;
    if (used > available) {
      break;
    }
    fitting += 1;
  }
  return fitting;
}

/**
 * How many of `items`, at the end of a single-line row `available` wide, have no room on it once
 * the ones that do not fit give way to an indicator standing for them.
 *
 * `indicator` holds the indicator's width, or nothing for a row that renders none. Its own width
 * is the reservation, so a row showing no indicator yet reserves the width of the one it would
 * show.
 */
export function countHidden(items: number[], indicator: number[], gap: number, available: number): number {
  // An engine that lays nothing out reports every box at zero width, and a row measuring zero has
  // no answer to give: every item stays on screen rather than collapsing into an indicator
  // standing for all of them.
  if (available === 0) {
    return 0;
  }

  if (countFitting(items, gap, available) === items.length) {
    return 0;
  }

  // The indicator is on the row from here on, so it takes its width off the row before any item
  // is counted onto it; its place at the head of this list is that reservation, not the end it
  // renders at. One item shows whatever it costs — a row of nothing but an indicator says how
  // many items there are and names none of them — and shrinks to the room left.
  const showing = Math.max(countFitting([...indicator, ...items], gap, available) - 1, 1);
  return items.length - showing;
}

/**
 * How many of a row's items have no room on its single line. What fits is measured rather than
 * capped at a number: a count that suits one container is wrong for a narrower one, where it
 * already overflows, and for a wider one, where it leaves room the container could have used.
 *
 * The read happens with the row marked `data-measuring`, which puts every item back on it at its
 * own width — a hidden item has no width to weigh, and the row itself shrinks to whatever is left
 * in it once some are hidden, so both reads have to see an uncollapsed row. The attribute is set
 * and removed inside this one synchronous call, so the state it describes never paints.
 *
 * The indicator is measured as it currently reads, so a hidden count crossing a digit boundary is
 * a fraction of a character out until the next measurement.
 */
export function measureHidden(row: HTMLElement, itemSelector: string, indicatorSelector: string): number {
  row.setAttribute("data-measuring", "");
  const items = widthsOf(row, itemSelector);
  const indicator = widthsOf(row, indicatorSelector);
  const available = row.clientWidth;
  row.removeAttribute("data-measuring");

  const gap = Number.parseFloat(getComputedStyle(row).columnGap);
  return countHidden(items, indicator, gap, available);
}
