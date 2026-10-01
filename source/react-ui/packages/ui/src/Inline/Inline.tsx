import type { ComponentPropsWithRef, CSSProperties, ElementType, ReactNode } from "react";
import { ALIGN_VALUES, type FlexAlign, type FlexJustify, JUSTIFY_VALUES, resolveKeyword } from "../internal/flexKeywords.js";
import { resolveSpace, type SpaceToken } from "../internal/space.js";
import { inlineStylesheet } from "./Inline.stylesheet.js";

export type InlineAlign = FlexAlign;

export type InlineJustify = FlexJustify;

const DEFAULT_ALIGN: InlineAlign = "stretch";

const DEFAULT_JUSTIFY: InlineJustify = "start";

interface InlineOwnProps {
  /** The space between children, along the row and between wrapped lines, as a spacing-scale step name or `none`. */
  gap?: SpaceToken;
  /** Cross-axis alignment of the children. */
  align?: InlineAlign;
  /** Main-axis distribution of the children. */
  justify?: InlineJustify;
  /** Whether children that overflow the row continue on a new line. */
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * `as` changes the rendered element, so a row of list items can be a `<ul>`; the row's layout is
 * the same whatever the tag. `ref` is an ordinary prop and reaches that element.
 */
export type InlineProps<C extends ElementType = "div"> = InlineOwnProps & {
  as?: C;
} & Omit<ComponentPropsWithRef<C>, keyof InlineOwnProps | "as">;

/**
 * The library's horizontal layout primitive: its children in a row, `gap` apart, wrapping onto
 * further lines unless `wrap` is false. It draws nothing of its own. Each prop reaches the
 * stylesheet as a `--vpg-inline-*` property set inline to a `var()` read, `0` or a mapped keyword,
 * and every one is always set, defaulted when the caller omits it. A caller's `style` is spread
 * after them and wins.
 */
export function Inline<C extends ElementType = "div">({
  gap = "space-4",
  align = DEFAULT_ALIGN,
  justify = DEFAULT_JUSTIFY,
  wrap = true,
  as,
  className,
  style,
  children,
  ...rest
}: InlineProps<C>) {
  const Component: ElementType = as ?? "div";

  const classes = ["vpg-inline", className].filter(Boolean).join(" ");

  const layout = {
    "--vpg-inline-gap": resolveSpace(gap),
    "--vpg-inline-align": resolveKeyword(ALIGN_VALUES, align, DEFAULT_ALIGN),
    "--vpg-inline-justify": resolveKeyword(JUSTIFY_VALUES, justify, DEFAULT_JUSTIFY),
    "--vpg-inline-wrap": wrap ? "wrap" : "nowrap",
    ...style,
  } as CSSProperties;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N inlines on a page inject one
        stylesheet.
      */}
      <style href="vpg-inline" precedence="vpg-inline">
        {inlineStylesheet}
      </style>
      <Component {...rest} className={classes} style={layout}>
        {children}
      </Component>
    </>
  );
}
