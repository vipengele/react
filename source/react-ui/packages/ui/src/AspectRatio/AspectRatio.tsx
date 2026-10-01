import type { ComponentPropsWithRef, CSSProperties, ElementType, ReactNode } from "react";
import { aspectRatioStylesheet } from "./AspectRatio.stylesheet.js";

const DEFAULT_RATIO = 1;

/**
 * A degenerate ratio (non-finite, zero or negative) makes `aspect-ratio` invalid, so the box
 * silently falls back to `auto` and takes its content's height. The value is clamped to `1`
 * instead, so the box always holds a ratio and the prop never passes an invalid value to CSS.
 */
function resolveRatio(ratio: number): number {
  return Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_RATIO;
}

interface AspectRatioOwnProps {
  /** Width over height, such as `16 / 9`. A positive number; defaults to `1`. */
  ratio?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * `as` changes the rendered element, so a captioned image can be a `<figure>`; the box's ratio is
 * the same whatever the tag. `ref` is an ordinary prop and reaches that element.
 */
export type AspectRatioProps<C extends ElementType = "div"> = AspectRatioOwnProps & {
  as?: C;
} & Omit<ComponentPropsWithRef<C>, keyof AspectRatioOwnProps | "as">;

/**
 * The library's fixed-proportion layout primitive: a box that holds `ratio` and fills with its
 * media or embed. It draws nothing of its own. The ratio reaches the stylesheet as the
 * `--vpg-aspect-ratio-ratio` property set inline to a positive number, always set, defaulted when
 * the caller omits it. A caller's `style` is spread after it and wins.
 */
export function AspectRatio<C extends ElementType = "div">({
  ratio = DEFAULT_RATIO,
  as,
  className,
  style,
  children,
  ...rest
}: AspectRatioProps<C>) {
  const Component: ElementType = as ?? "div";

  const classes = ["vpg-aspect-ratio", className].filter(Boolean).join(" ");

  const layout = {
    "--vpg-aspect-ratio-ratio": String(resolveRatio(ratio)),
    ...style,
  } as CSSProperties;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N boxes on a page inject one
        stylesheet.
      */}
      <style href="vpg-aspect-ratio" precedence="vpg-aspect-ratio">
        {aspectRatioStylesheet}
      </style>
      <Component {...rest} className={classes} style={layout}>
        {children}
      </Component>
    </>
  );
}
