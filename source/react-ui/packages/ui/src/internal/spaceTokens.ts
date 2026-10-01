/**
 * The names of the spacing scale's steps, and `none` for no space at all. A layout primitive's
 * length props accept these names and never a length, so every gap lands on the scale.
 */
export type SpaceToken = "none" | "space-1" | "space-2" | "space-3" | "space-4" | "space-5" | "space-6" | "space-7" | "space-8";

/**
 * Each name's CSS value: a bare `var()` read of the theme's spacing step, or `0` for `none`.
 * A consumer looks a prop up here rather than interpolating it, so a value outside the scale
 * never reaches a style declaration.
 */
export const spaceTokenValue: Readonly<Record<SpaceToken, string>> = {
  none: "0",
  "space-1": "var(--vpg-space-1)",
  "space-2": "var(--vpg-space-2)",
  "space-3": "var(--vpg-space-3)",
  "space-4": "var(--vpg-space-4)",
  "space-5": "var(--vpg-space-5)",
  "space-6": "var(--vpg-space-6)",
  "space-7": "var(--vpg-space-7)",
  "space-8": "var(--vpg-space-8)",
};
