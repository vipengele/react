import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";
import { gridStylesheet } from "./Grid.stylesheet.js";

interface GridItemOwnProps {
  /** The number of columns the item spans, a positive integer. */
  colSpan?: number;
  /** The number of rows the item spans, a positive integer. */
  rowSpan?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** `as` overrides only the rendered tag, as on `Grid`. */
export type GridItemProps<C extends ElementType = "div"> = GridItemOwnProps & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof GridItemOwnProps | "as">;

/**
 * Places one child in a grid through `colSpan` and `rowSpan`. Each span given is written inline as
 * a `--vpg-grid-item-*` count, alongside the class whose rule reads it; a span not given writes
 * neither, and the item takes one track on that axis.
 *
 * It has no context and no check that its parent is a `Grid`: span placement means the same
 * thing inside any CSS grid. Inside an auto-fit `Grid`, a `colSpan` wider than the tracks that
 * currently fit adds implicit tracks, as plain CSS does (ADR-0022). A caller's `style` is spread
 * last.
 */
export function GridItem<C extends ElementType = "div">({ colSpan, rowSpan, as, className, style, children, ...rest }: GridItemProps<C>) {
  const Component: ElementType = as ?? "div";

  const classes = [
    "vpg-grid-item",
    colSpan !== undefined && "vpg-grid-item-col-span",
    rowSpan !== undefined && "vpg-grid-item-row-span",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const properties: Record<string, string> = {};
  if (colSpan !== undefined) properties["--vpg-grid-item-col-span"] = String(colSpan);
  if (rowSpan !== undefined) properties["--vpg-grid-item-row-span"] = String(rowSpan);

  return (
    <>
      {/*
        The same stylesheet `Grid` injects, under the same `href`, so React 19 keeps one copy
        however many grids and items a page holds.
      */}
      <style href="vpg-grid" precedence="vpg-grid">
        {gridStylesheet}
      </style>
      <Component {...rest} className={classes} style={{ ...properties, ...style }}>
        {children}
      </Component>
    </>
  );
}
