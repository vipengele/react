import type { ComponentPropsWithRef, CSSProperties, ElementType, ReactNode } from "react";
import { ALIGN_VALUES, type FlexAlign, type FlexJustify, JUSTIFY_VALUES, resolveKeyword } from "../internal/flexKeywords.js";
import { resolveSpace, type SpaceToken } from "../internal/space.js";
import { stackStylesheet } from "./Stack.stylesheet.js";

export type StackAlign = FlexAlign;

export type StackJustify = FlexJustify;

const DEFAULT_ALIGN: StackAlign = "stretch";

const DEFAULT_JUSTIFY: StackJustify = "start";

interface StackOwnProps {
  /** The space between children, as a spacing-scale step name or `none`. */
  gap?: SpaceToken;
  /** Cross-axis alignment of the children. */
  align?: StackAlign;
  /** Main-axis distribution of the children. */
  justify?: StackJustify;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * `as` changes the rendered element, so a stack of list items can be a `<ul>`; the stack's layout
 * is the same whatever the tag. `ref` is an ordinary prop and reaches that element.
 */
export type StackProps<C extends ElementType = "div"> = StackOwnProps & {
  as?: C;
} & Omit<ComponentPropsWithRef<C>, keyof StackOwnProps | "as">;

/**
 * The library's vertical layout primitive: its children in a column, `gap` apart. It draws
 * nothing of its own. Each prop reaches the stylesheet as a `--vpg-stack-*` property set inline
 * to a `var()` read, `0` or a mapped keyword, and every one is always set, defaulted when the
 * caller omits it. A caller's `style` is spread after them and wins.
 */
export function Stack<C extends ElementType = "div">({
  gap = "space-4",
  align = DEFAULT_ALIGN,
  justify = DEFAULT_JUSTIFY,
  as,
  className,
  style,
  children,
  ...rest
}: StackProps<C>) {
  const Component: ElementType = as ?? "div";

  const classes = ["vpg-stack", className].filter(Boolean).join(" ");

  const layout = {
    "--vpg-stack-gap": resolveSpace(gap),
    "--vpg-stack-align": resolveKeyword(ALIGN_VALUES, align, DEFAULT_ALIGN),
    "--vpg-stack-justify": resolveKeyword(JUSTIFY_VALUES, justify, DEFAULT_JUSTIFY),
    ...style,
  } as CSSProperties;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N stacks on a page inject one
        stylesheet.
      */}
      <style href="vpg-stack" precedence="vpg-stack">
        {stackStylesheet}
      </style>
      <Component {...rest} className={classes} style={layout}>
        {children}
      </Component>
    </>
  );
}
