import { ExternalLink } from "@vipengele/react-icons";
import type { ComponentPropsWithoutRef, ComponentPropsWithRef, ElementType, ReactNode } from "react";
import { linkStylesheet } from "./Link.stylesheet.js";

/** The role ramp a link's colour, hover, visited and focus-ring states read from. */
export type LinkTone = "accent" | "danger";

interface LinkOwnProps<C extends ElementType> {
  tone?: LinkTone;
  /**
   * The destination leaves the app. Opens it in a new tab with `rel="noopener noreferrer"`, marks
   * it with the external-link glyph and adds "opens in a new tab" to its accessible name. Stated
   * by the caller rather than inferred from `href`: with `as` pointing at a router's link, the
   * destination is whatever that router accepts, and nothing here can tell whether it leaves
   * the origin.
   */
  external?: boolean;
  /** A ref to the rendered element — the `<a>`, or whatever `as` renders. */
  ref?: ComponentPropsWithRef<C>["ref"];
  className?: string;
  children?: ReactNode;
}

/**
 * `as` swaps the rendered element for another — typically a router's own link component — while
 * keeping the link's styling; every other prop is forwarded to it untouched.
 */
export type LinkProps<C extends ElementType = "a"> = LinkOwnProps<C> & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof LinkOwnProps<C> | "as">;

/**
 * The library's inline navigation atom. It owns colour and interaction states only, never
 * typography: it inherits the size and weight of the text around it, like a plain `<a>`, and a
 * caller who wants a typographic style nests it inside `Typography`.
 */
export function Link<C extends ElementType = "a">({ as, tone = "accent", external = false, className, children, ...rest }: LinkProps<C>) {
  const Component: ElementType = as ?? "a";

  const classes = ["vpg-link", `vpg-link-${tone}`, className].filter(Boolean).join(" ");

  // Spread before the caller's props, so an explicit `target` or `rel` still wins.
  const externalAttributes = external ? { target: "_blank", rel: "noopener noreferrer" } : undefined;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N links on a page inject one
        stylesheet.
      */}
      <style href="vpg-link" precedence="vpg-link">
        {linkStylesheet}
      </style>
      <Component {...externalAttributes} {...rest} className={classes}>
        {children}
        {/*
          The leading space separates the link text from the glyph visually and keeps "opens in
          a new tab" a separate word in the accessible name, whatever an engine's rules for
          joining the text of adjacent elements.
        */}
        {external ? (
          <>
            {" "}
            <ExternalLink className="vpg-link-icon" aria-hidden="true" />
            <span className="vpg-link-visually-hidden">opens in a new tab</span>
          </>
        ) : null}
      </Component>
    </>
  );
}
