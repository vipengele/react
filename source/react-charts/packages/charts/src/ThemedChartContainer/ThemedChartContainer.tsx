import type { Ref } from "react";
import { ResponsiveContainer, type ResponsiveContainerProps } from "recharts";
import { themedChartContainerStylesheet } from "./ThemedChartContainer.stylesheet.js";

/**
 * Recharts' `ResponsiveContainer` props, with `width` narrowed to a percentage of the parent,
 * `className` to a string, and `ref` an ordinary prop reaching the container's element.
 *
 * `width` is never a pixel count: given a numeric width and a numeric (or aspect-derived) height,
 * Recharts renders no element of its own and hands the size straight to the chart, so there would
 * be no box to carry the theme. A chart of fixed pixel size needs no responsive container.
 */
export type ThemedChartContainerProps = Omit<ResponsiveContainerProps, "width" | "className"> & {
  /** A percentage of the parent's width, such as `"100%"`; defaults to `"100%"`. */
  width?: `${number}%`;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

/**
 * The box every vipengele chart renders into: Recharts' `ResponsiveContainer`, sized exactly as
 * that component sizes itself — `width` a percentage of the parent, `height` a pixel count or a
 * percentage of a parent of definite height, or `aspect` deriving the height from the width — and
 * carrying the `vpg-chart-container` class.
 *
 * The contract it gives a child chart is the theme's ink and border: the container's `color` is
 * `--vpg-ink`, so whatever the chart paints with `currentColor` follows the theme and its colour
 * mode, and a 1px `--vpg-border` frame is drawn over the container's edge, taking none of the
 * chart's space: the chart is laid out at the container's full size. Both tokens come from an
 * enclosing `ThemeProvider`; outside one,
 * neither resolves. Inside another responsive container Recharts adds no second box, so the outer
 * container's frame and ink are the ones that apply.
 */
export function ThemedChartContainer({ className, children, ...rest }: ThemedChartContainerProps) {
  const classes = ["vpg-chart-container", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N charts on a page inject one
        stylesheet.
      */}
      <style href="vpg-chart-container" precedence="vpg-chart-container">
        {themedChartContainerStylesheet}
      </style>
      <ResponsiveContainer {...rest} className={classes}>
        {children}
      </ResponsiveContainer>
    </>
  );
}
