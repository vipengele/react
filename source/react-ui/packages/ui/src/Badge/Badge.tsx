import type { ComponentPropsWithRef, ReactNode } from "react";
import { badgeStylesheet } from "./Badge.stylesheet.js";

export type BadgeVariant = "neutral" | "accent" | "danger";

export type BadgeEmphasis = "subtle" | "solid";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends ComponentPropsWithRef<"span"> {
  variant?: BadgeVariant;
  /** `subtle` sits on a tinted wash with ink-coloured text; `solid` fills with the variant's
   * own colour and its contrast ink. */
  emphasis?: BadgeEmphasis;
  size?: BadgeSize;
  /** Rendered before the label and hidden from assistive technology, so the label alone is
   * announced. An icon drawn in `currentColor` takes the variant's text colour. */
  icon?: ReactNode;
}

/**
 * A static, non-interactive status or category mark. Every colour comes from `--vpg-*` custom
 * properties read through `var()` in its own stylesheet, so a badge follows colour mode without
 * re-rendering.
 */
export function Badge({ variant = "neutral", emphasis = "subtle", size = "md", icon, className, children, ...rest }: BadgeProps) {
  const classes = ["vpg-badge", `vpg-badge-${variant}`, `vpg-badge-${emphasis}`, `vpg-badge-${size}`, className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N badges on a page inject one
        stylesheet.
      */}
      <style href="vpg-badge" precedence="vpg-badge">
        {badgeStylesheet}
      </style>
      <span {...rest} className={classes}>
        {icon === undefined || icon === null ? null : (
          <span className="vpg-badge-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </span>
    </>
  );
}
