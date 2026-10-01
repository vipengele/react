import type { HTMLAttributes, Ref } from "react";
import { separatorStylesheet } from "./Separator.stylesheet.js";

export type SeparatorOrientation = "horizontal" | "vertical";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  /** `HTMLAttributes` carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLDivElement>;
  orientation?: SeparatorOrientation;
  /**
   * A decorative separator is hidden from assistive technology entirely. Leave it `false` when
   * the line divides content a screen-reader user should hear as separate sections.
   */
  decorative?: boolean;
}

/**
 * A hairline dividing content, horizontally between stacked blocks or vertically between items in
 * a row. Semantic by default, announced as a `separator` with its orientation.
 */
export function Separator({ orientation = "horizontal", decorative = false, className, ref, ...rest }: SeparatorProps) {
  const classes = ["vpg-separator", `vpg-separator-${orientation}`, className].filter(Boolean).join(" ");

  // Written after the spread so a caller's own `role`/`aria-*` cannot contradict the branch: a
  // decorative line announced as a separator, or a semantic one hidden from the tree.
  const semantics = decorative
    ? { role: undefined, "aria-orientation": undefined, "aria-hidden": true as const }
    : { role: "separator", "aria-orientation": orientation, "aria-hidden": undefined };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N separators on a page inject one
        stylesheet.
      */}
      <style href="vpg-separator" precedence="vpg-separator">
        {separatorStylesheet}
      </style>
      <div {...rest} {...semantics} ref={ref} className={classes} />
    </>
  );
}
