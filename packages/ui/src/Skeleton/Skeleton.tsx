import type { CSSProperties, HTMLAttributes } from "react";
import { skeletonStylesheet } from "./Skeleton.stylesheet.js";

export type SkeletonVariant = "rect" | "circle" | "text";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  /** A number is treated as pixels, matching React's own inline-style convention; a string
   * carries its own unit. Neither is a `--tandiko-*` custom property, so both are safe to set
   * as an inline style — they're the per-instance dimensions the caller controls, not a
   * theme-controlled colour. */
  width?: string | number;
  /** Same convention as `width`. Left unset, the variant's own stylesheet rule sizes it. */
  height?: string | number;
}

function toDimension(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * A shimmering placeholder that stands in for content still loading, shaped to match what it
 * will become: a line of text, a rectangular block, or a circular avatar/icon slot.
 */
export function Skeleton({
  variant = "text",
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const classes = ["tandiko-skeleton", `tandiko-skeleton-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  const dimensions: CSSProperties = {
    width: toDimension(width),
    height: toDimension(height),
  };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N skeletons on a page inject one
        stylesheet.
      */}
      <style href="tandiko-skeleton" precedence="tandiko-skeleton">
        {skeletonStylesheet}
      </style>
      {/* Decorative by construction: it stands in for content that isn't there yet, so nothing
          about it is meant to reach the accessibility tree. */}
      <div
        {...rest}
        aria-hidden="true"
        className={classes}
        style={{ ...dimensions, ...style }}
      />
    </>
  );
}
