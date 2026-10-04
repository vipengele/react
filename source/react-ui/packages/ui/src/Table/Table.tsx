import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import { tableStylesheet } from "./Table.stylesheet.js";

export type TableDensity = "compact" | "regular" | "relaxed";

export type TableCellAlign = "start" | "center" | "end";

export interface TableProps extends Omit<ComponentPropsWithRef<"table">, "children"> {
  /** `Table.Head`, `Table.Body` and `Table.Foot`, or anything that renders them — fragments and
   * wrapper components are rendered as given. */
  children?: ReactNode;
  /** Rendered as the table's `<caption>`. A caption also makes the scroll container a labelled,
   * focusable region, so a keyboard user can scroll an overflowing table. */
  caption?: ReactNode;
  /** Cell padding, from steps of the space scale. */
  density?: TableDensity;
  /** Pins `Table.Head` to the top of the scroll container while the body scrolls under it. Only
   * takes effect when the container's block size is bounded — by `style`, `className`, or the
   * layout around it. */
  stickyHeader?: boolean;
  /** Applied to the scroll container, not the `<table>`. */
  className?: string;
  /** Applied to the scroll container, not the `<table>`. */
  style?: ComponentPropsWithRef<"div">["style"];
}

export type TableHeadProps = ComponentPropsWithRef<"thead">;

export type TableBodyProps = ComponentPropsWithRef<"tbody">;

export type TableFootProps = ComponentPropsWithRef<"tfoot">;

export type TableRowProps = ComponentPropsWithRef<"tr">;

export interface TableHeaderCellProps extends Omit<ComponentPropsWithRef<"th">, "align"> {
  /** Inline alignment of the cell's content, replacing the obsolete native `align` attribute. */
  align?: TableCellAlign;
}

export interface TableCellProps extends Omit<ComponentPropsWithRef<"td">, "align"> {
  /** Inline alignment of the cell's content, replacing the obsolete native `align` attribute. */
  align?: TableCellAlign;
}

function joinClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function TableHead({ className, ...rest }: TableHeadProps) {
  return <thead {...rest} className={joinClasses("vpg-table-head", className)} />;
}

function TableBody({ className, ...rest }: TableBodyProps) {
  return <tbody {...rest} className={joinClasses("vpg-table-body", className)} />;
}

function TableFoot({ className, ...rest }: TableFootProps) {
  return <tfoot {...rest} className={joinClasses("vpg-table-foot", className)} />;
}

function TableRow({ className, ...rest }: TableRowProps) {
  return <tr {...rest} className={joinClasses("vpg-table-row", className)} />;
}

function TableHeaderCell({ align = "start", scope = "col", className, ...rest }: TableHeaderCellProps) {
  return <th {...rest} scope={scope} className={joinClasses("vpg-table-header-cell", `vpg-table-align-${align}`, className)} />;
}

function TableCell({ align = "start", className, ...rest }: TableCellProps) {
  return <td {...rest} className={joinClasses("vpg-table-cell", `vpg-table-align-${align}`, className)} />;
}

function TableImpl({ caption, density = "regular", stickyHeader = false, className, style, children, ...rest }: TableProps) {
  const captionId = useId();
  const hasCaption = caption !== undefined && caption !== null && caption !== false && caption !== "";
  const classes = joinClasses("vpg-table", `vpg-table-density-${density}`, stickyHeader ? "vpg-table-sticky-header" : undefined);

  // The container scrolls, so with a caption to name it, it is a focusable region a keyboard user
  // can scroll. Without one it would be an unnamed region, so it stays a plain `<div>`.
  const regionProps = hasCaption ? { role: "region" as const, tabIndex: 0, "aria-labelledby": captionId } : {};

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N tables on a page inject one
        stylesheet.
      */}
      <style href="vpg-table" precedence="vpg-table">
        {tableStylesheet}
      </style>
      <div {...regionProps} className={joinClasses("vpg-table-container", className)} style={style}>
        <table {...rest} className={classes}>
          {hasCaption ? (
            <caption id={captionId} className="vpg-table-caption">
              {caption}
            </caption>
          ) : null}
          {children}
        </table>
      </div>
    </>
  );
}

type TableComponent = typeof TableImpl & {
  Head: typeof TableHead;
  Body: typeof TableBody;
  Foot: typeof TableFoot;
  Row: typeof TableRow;
  HeaderCell: typeof TableHeaderCell;
  Cell: typeof TableCell;
};

/**
 * A presentational data table: `Table.Head`, `Table.Body` and `Table.Foot` hold `Table.Row`s of
 * `Table.HeaderCell`s and `Table.Cell`s, each rendering its native element and passing `ref` and
 * native props through. The `<table>` sits inside a scroll container, so a table wider or taller
 * than its space scrolls rather than overflowing the page.
 */
// The `@__PURE__` annotation lets Rollup/esbuild drop an unused `Table` export entirely rather
// than keeping the module in case `Object.assign` has an observable side effect.
export const Table = /* @__PURE__ */ Object.assign(TableImpl, {
  Head: TableHead,
  Body: TableBody,
  Foot: TableFoot,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
}) as TableComponent;
