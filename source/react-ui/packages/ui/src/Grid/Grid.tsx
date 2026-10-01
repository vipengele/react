import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";
import { resolveSpace, type SpaceToken } from "../internal/space.js";
import { gridStylesheet } from "./Grid.stylesheet.js";

/** The steps of the column-width scale `@vipengele/react-tokens` emits as `--vpg-column-*`. */
export type GridColumnWidth = "sm" | "md" | "lg" | "xl";

/**
 * Each step's CSS value, a bare `var()` read of the theme's column-width token. The prop is
 * looked up here rather than interpolated, so a value outside the scale never reaches a style
 * declaration.
 */
const COLUMN_WIDTH_VALUE: Readonly<Record<GridColumnWidth, string>> = {
  sm: "var(--vpg-column-sm)",
  md: "var(--vpg-column-md)",
  lg: "var(--vpg-column-lg)",
  xl: "var(--vpg-column-xl)",
};

interface GridOwnProps {
  /** The space between rows and between columns. Defaults to `space-4`. */
  gap?: SpaceToken;
  /** The space between rows, overriding `gap` on that axis. */
  rowGap?: SpaceToken;
  /** The space between columns, overriding `gap` on that axis. */
  columnGap?: SpaceToken;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * The two ways a grid sizes its columns, mutually exclusive: a fixed `columns` count of equal
 * tracks, or as many tracks as fit, none narrower than the `minColumnWidth` step. A grid given
 * neither auto-fits at `md`.
 */
type GridColumnsProps =
  | {
      /** The number of equal-width columns, a positive integer. */
      columns: number;
      minColumnWidth?: never;
    }
  | {
      columns?: never;
      /** The column-width step no auto-fitted column is narrower than. Defaults to `md`. */
      minColumnWidth?: GridColumnWidth;
    };

/**
 * `as` overrides only the rendered tag: `<Grid as="ul">` lays out its `<li>` children the same
 * way a `<div>` would.
 */
export type GridProps<C extends ElementType = "div"> = GridOwnProps &
  GridColumnsProps & {
    as?: C;
  } & Omit<ComponentPropsWithoutRef<C>, keyof GridOwnProps | "columns" | "minColumnWidth" | "as">;

/**
 * A layout primitive placing its children in columns. With `columns` it repeats that many equal
 * tracks; without, it auto-fits as many tracks as its container's width allows at the
 * `minColumnWidth` step, which is how one grid shows four columns on a wide screen and one on a
 * narrow one with no breakpoint (ADR-0022).
 *
 * Every per-instance value is written inline as a `--vpg-grid-*` property holding a `var()` read
 * of a theme token, `0`, or a count — never a resolved length — so the instance keeps following
 * the theme it sits under (ADR-0019). The instance writes every property its mode's rule reads:
 * both gaps always, and `--vpg-grid-columns` or `--vpg-grid-min-column` by mode. A caller's
 * `style` is spread last.
 */
export function Grid<C extends ElementType = "div">({
  columns,
  minColumnWidth = "md",
  gap = "space-4",
  rowGap = gap,
  columnGap = gap,
  as,
  className,
  style,
  children,
  ...rest
}: GridProps<C>) {
  const Component: ElementType = as ?? "div";
  const fixed = columns !== undefined;

  const classes = ["vpg-grid", fixed ? "vpg-grid-columns" : "vpg-grid-fit", className].filter(Boolean).join(" ");

  const properties: Record<string, string | 0> = {
    "--vpg-grid-row-gap": resolveSpace(rowGap),
    "--vpg-grid-column-gap": resolveSpace(columnGap),
  };
  if (fixed) {
    properties["--vpg-grid-columns"] = String(columns);
  } else {
    properties["--vpg-grid-min-column"] = COLUMN_WIDTH_VALUE[minColumnWidth];
  }

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so every Grid and GridItem on a page
        shares one stylesheet.
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
