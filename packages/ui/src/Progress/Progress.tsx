import type { HTMLAttributes } from "react";
import { progressStylesheet } from "./Progress.stylesheet.js";

export type ProgressSize = "sm" | "md" | "lg";

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The current amount of progress. Omitted (the default) renders the indeterminate, looping
   * sweep variant — a progress bar with no known value has nothing to report as a percentage. */
  value?: number;
  /** The value that represents completion. */
  max?: number;
  size?: ProgressSize;
}

/**
 * Clamps `value` into `[0, max]` — a caller passing a value outside that range (a stale total, a
 * count that overshoots its max) still renders a bar that reads as complete or empty rather than
 * overflowing the track or reporting an invalid `aria-valuenow`.
 */
function clamp(value: number, max: number): number {
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

/**
 * The library's progress atom: a linear track with a filled bar. Determinate when `value` is
 * given (`aria-valuenow`/`-valuemin`/`-valuemax` report the exact position), indeterminate
 * otherwise (a looping sweep, with no `aria-value*` — per ARIA, a progressbar with no known value
 * should not report a fake one).
 */
export function Progress({ value, max = 100, size = "md", className, style, ...rest }: ProgressProps) {
  const determinate = value !== undefined;
  const percentage = determinate ? (clamp(value, max) / max) * 100 : undefined;

  const classes = [
    "tandiko-progress",
    `tandiko-progress-${size}`,
    determinate ? "tandiko-progress-determinate" : "tandiko-progress-indeterminate",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const labelling = determinate
    ? { "aria-valuenow": clamp(value, max), "aria-valuemin": 0, "aria-valuemax": max }
    : undefined;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N progress bars on a page inject one
        stylesheet.
      */}
      <style href="tandiko-progress" precedence="tandiko-progress">
        {progressStylesheet}
      </style>
      <div {...rest} role="progressbar" {...labelling} className={classes} style={style}>
        <div
          className="tandiko-progress-fill"
          style={determinate ? { width: `${percentage}%` } : undefined}
        />
      </div>
    </>
  );
}
