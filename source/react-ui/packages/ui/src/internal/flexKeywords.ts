/** The cross-axis alignment keywords a flex layout primitive accepts. */
export type FlexAlign = "start" | "center" | "end" | "stretch" | "baseline";

/** The main-axis distribution keywords a flex layout primitive accepts. */
export type FlexJustify = "start" | "center" | "end" | "between";

/** Each `align` keyword's `align-items` value. */
export const ALIGN_VALUES: Readonly<Record<FlexAlign, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

/** Each `justify` keyword's `justify-content` value. */
export const JUSTIFY_VALUES: Readonly<Record<FlexJustify, string>> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

/**
 * Looks a keyword up in its table. A keyword the table does not hold, including one a caller
 * casts past the type, resolves to the default rather than reaching the element verbatim, so the
 * prop never becomes a pass-through to arbitrary CSS.
 */
export function resolveKeyword<K extends string>(table: Readonly<Record<K, string>>, keyword: K, fallback: K): string {
  return Object.hasOwn(table, keyword) ? table[keyword] : table[fallback];
}
