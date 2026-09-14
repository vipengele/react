import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { typographyStylesheet } from "./Typography.stylesheet.js";

export type TypographyVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body-lg"
  | "body-md"
  | "body-sm"
  | "caption";

export type TypographyWeight = "regular" | "medium" | "bold";

/** A curated set of `--tandiko-*` ink tokens — no arbitrary CSS colour is accepted, so text
 * always tracks light/dark mode through the same variables the rest of the library reads. */
export type TypographyColor = "primary" | "secondary" | "subtle" | "accent";

/** The element each variant renders when a caller doesn't override it with `as`, chosen for
 * the semantic level a reader would expect from the variant's name. */
const VARIANT_ELEMENT: Record<TypographyVariant, ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  "body-lg": "p",
  "body-md": "p",
  "body-sm": "p",
  caption: "span",
};

interface TypographyOwnProps {
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  color?: TypographyColor;
  className?: string;
  children?: ReactNode;
}

/**
 * `as` overrides only the rendered tag, never the visual style: `<Typography variant="h1"
 * as="div">` keeps the h1 look but renders a `<div>`, which is how a heading-styled label can
 * sit somewhere an `<h1>` would break document outline rules.
 */
export type TypographyProps<C extends ElementType = "p"> = TypographyOwnProps & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof TypographyOwnProps | "as">;

/**
 * The library's text atom. Visual style comes from `variant`/`weight`/`color`; the rendered
 * tag comes from `variant`'s default or from `as`, independently of one another.
 */
export function Typography<C extends ElementType = "p">({
  variant = "body-md",
  weight = "regular",
  color = "primary",
  as,
  className,
  children,
  ...rest
}: TypographyProps<C>) {
  const Component = as ?? VARIANT_ELEMENT[variant];

  const classes = [
    "tandiko-typography",
    `tandiko-typography-${variant}`,
    `tandiko-typography-weight-${weight}`,
    `tandiko-typography-color-${color}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N Typography instances on a page
        inject one stylesheet.
      */}
      <style href="tandiko-typography" precedence="tandiko-typography">
        {typographyStylesheet}
      </style>
      <Component {...rest} className={classes}>
        {children}
      </Component>
    </>
  );
}
