/** The spacing-scale step names a layout primitive's length props accept, plus `none`. */
export type SpaceToken = "none" | "space-1" | "space-2" | "space-3" | "space-4" | "space-5" | "space-6" | "space-7" | "space-8";

/**
 * Each token name's inline value: a `var()` read of the theme's step, so the instance keeps
 * following the theme it sits under. `none` is a keyword, not a step: it maps to `0`, and the
 * theme defines no `--vpg-space-0`.
 */
export const spaceValues: Readonly<Record<SpaceToken, string | 0>> = {
  none: 0,
  "space-1": "var(--vpg-space-1)",
  "space-2": "var(--vpg-space-2)",
  "space-3": "var(--vpg-space-3)",
  "space-4": "var(--vpg-space-4)",
  "space-5": "var(--vpg-space-5)",
  "space-6": "var(--vpg-space-6)",
  "space-7": "var(--vpg-space-7)",
  "space-8": "var(--vpg-space-8)",
};

const defaultSpaceToken: SpaceToken = "space-4";

/**
 * Turns a token name into its inline value. A name the table does not hold, including one a
 * caller casts past the type, resolves to the default step rather than passing through verbatim,
 * so no off-scale length reaches the element.
 */
export function resolveSpace(token: SpaceToken): string | 0 {
  return Object.hasOwn(spaceValues, token) ? spaceValues[token] : spaceValues[defaultSpaceToken];
}
