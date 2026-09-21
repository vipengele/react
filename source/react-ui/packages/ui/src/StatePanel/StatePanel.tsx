import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Typography } from "../Typography/Typography.js";
import { statePanelStylesheet } from "./StatePanel.stylesheet.js";

export type StatePanelVariant = "empty" | "error" | "not-found";

export interface StatePanelProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  variant?: StatePanelVariant;
  title: ReactNode;
  description?: ReactNode;
  /**
   * The panel's artwork. `undefined` and `null` both render no media, and any other node renders
   * as given. The slot does not size its content, so an icon or image brings its own size.
   */
  media?: ReactNode;
  /** The element the title renders as; defaults to `h2`. */
  titleAs?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div";
  /** The actions area, rendered after the text. */
  children?: ReactNode;
}

/**
 * A centred panel that explains why a region has nothing to show. Copy is always supplied by
 * the caller. In the `error` variant the title and description sit in a `role="alert"` wrapper
 * so assistive technology announces them when the panel appears.
 */
export function StatePanel({
  variant = "empty",
  title,
  description,
  media,
  titleAs = "h2",
  children,
  className,
  ...rest
}: StatePanelProps) {
  const classes = ["vpg-state-panel", `vpg-state-panel-${variant}`, className].filter(Boolean).join(" ");

  return (
    <>
      {/* React 19 hoists and de-duplicates this by `href`. */}
      <style href="vpg-state-panel" precedence="vpg-state-panel">
        {statePanelStylesheet}
      </style>
      <div {...rest} className={classes}>
        {media === undefined || media === null ? null : media}
        <div className="vpg-state-panel-text" role={variant === "error" ? "alert" : undefined}>
          <Typography variant="h4" as={titleAs}>
            {title}
          </Typography>
          {description === undefined || description === null ? null : (
            <Typography variant="body-md" color="secondary">
              {description}
            </Typography>
          )}
        </div>
        {children === undefined || children === null ? null : <div className="vpg-state-panel-actions">{children}</div>}
      </div>
    </>
  );
}
