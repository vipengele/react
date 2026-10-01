import type { ComponentPropsWithRef, CSSProperties, ElementType, ReactNode } from "react";
import { resolveSpace, type SpaceToken } from "../internal/space.js";
import { centerStylesheet } from "./Center.stylesheet.js";

/** The steps of the width scale `@vipengele/react-tokens` emits as `--vpg-width-*`. */
export type CenterMax = "sm" | "md" | "lg" | "xl";

/**
 * Each step's CSS value, a bare `var()` read of the theme's width token. The prop is looked up
 * here rather than interpolated, so a value outside the scale never reaches a style declaration.
 * A step the table does not hold, such as one a caller casts past the type, resolves to the
 * default so the stylesheet's bare read always finds a value.
 */
const MAX_VALUE: Readonly<Record<CenterMax, string>> = {
  sm: "var(--vpg-width-sm)",
  md: "var(--vpg-width-md)",
  lg: "var(--vpg-width-lg)",
  xl: "var(--vpg-width-xl)",
};

const DEFAULT_MAX: CenterMax = "lg";

interface CenterOwnProps {
  /** The width-scale step the centre's outer width, inset included, never grows past. */
  max?: CenterMax;
  /** The inline padding, as a spacing-scale step name or `none`. */
  inset?: SpaceToken;
  /** Centres each child at its own width rather than stretching it to the cap. */
  intrinsic?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * `as` changes the rendered element, so a page's main content can be a `<main>`; the centre's
 * layout is the same whatever the tag. `ref` is an ordinary prop and reaches that element.
 */
export type CenterProps<C extends ElementType = "div"> = CenterOwnProps & {
  as?: C;
} & Omit<ComponentPropsWithRef<C>, keyof CenterOwnProps | "as">;

/**
 * The library's page-shell layout primitive: it caps its content at a width-scale step, centres
 * it with auto inline margins and keeps it `inset` off its container's inline edges (ADR-0023).
 * It draws nothing of its own. `max` and `inset` reach the stylesheet as `--vpg-center-*`
 * properties set inline to a `var()` read or `0`, and both are always set, defaulted when the
 * caller omits them. A caller's `style` is spread after them and wins.
 */
export function Center<C extends ElementType = "div">({
  max = DEFAULT_MAX,
  inset = "space-4",
  intrinsic = false,
  as,
  className,
  style,
  children,
  ...rest
}: CenterProps<C>) {
  const Component: ElementType = as ?? "div";

  const classes = ["vpg-center", intrinsic ? "vpg-center-intrinsic" : undefined, className].filter(Boolean).join(" ");

  const layout = {
    "--vpg-center-max": Object.hasOwn(MAX_VALUE, max) ? MAX_VALUE[max] : MAX_VALUE[DEFAULT_MAX],
    "--vpg-center-inset": resolveSpace(inset),
    ...style,
  } as CSSProperties;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N centres on a page inject one
        stylesheet.
      */}
      <style href="vpg-center" precedence="vpg-center">
        {centerStylesheet}
      </style>
      <Component {...rest} className={classes} style={layout}>
        {children}
      </Component>
    </>
  );
}
