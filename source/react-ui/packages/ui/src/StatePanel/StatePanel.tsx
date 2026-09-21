import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Typography } from "../Typography/Typography.js";
import { EmptyIllustration } from "./EmptyIllustration.js";
import { ErrorIllustration } from "./ErrorIllustration.js";
import { NotFoundIllustration } from "./NotFoundIllustration.js";
import { statePanelStylesheet } from "./StatePanel.stylesheet.js";

export type StatePanelVariant = "empty" | "error" | "not-found";

/** The illustration each variant shows when the caller names no `media` of its own. */
const DEFAULT_MEDIA: Record<StatePanelVariant, () => ReactNode> = {
  empty: EmptyIllustration,
  error: ErrorIllustration,
  "not-found": NotFoundIllustration,
};

export interface StatePanelProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  variant?: StatePanelVariant;
  title: ReactNode;
  description?: ReactNode;
  /**
   * The panel's artwork. `undefined` renders the variant's own illustration, `null` renders no
   * media at all, and any other node renders as given and replaces the illustration. The slot
   * does not size its content, so an icon or image brings its own size.
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
  const Illustration = DEFAULT_MEDIA[variant];

  return (
    <>
      {/* React 19 hoists and de-duplicates this by `href`. */}
      <style href="vpg-state-panel" precedence="vpg-state-panel">
        {statePanelStylesheet}
      </style>
      <div {...rest} className={classes}>
        {media === undefined ? <Illustration /> : media}
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
