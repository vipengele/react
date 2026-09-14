import type { HTMLAttributes, ReactNode } from "react";
import { buttonGroupStylesheet } from "./ButtonGroup.stylesheet.js";

export type ButtonGroupOrientation = "horizontal" | "vertical";

interface ButtonGroupOwnProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  orientation?: ButtonGroupOrientation;
  children?: ReactNode;
}

export type ButtonGroupProps = ButtonGroupOwnProps;

/**
 * Groups plain `<Button>` children into a single attached control. Children are rendered
 * unmodified — no `cloneElement`, no context — the segmented look comes entirely from
 * `ButtonGroup`'s own stylesheet targeting `.tandiko-button` as a descendant, which makes
 * `Button`'s rendered class name a contract this component depends on.
 */
export function ButtonGroup({ orientation = "horizontal", className, children, ...rest }: ButtonGroupProps) {
  const classes = [
    "tandiko-button-group",
    `tandiko-button-group-${orientation}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N groups on a page inject one
        stylesheet.
      */}
      <style href="tandiko-button-group" precedence="tandiko-button-group">
        {buttonGroupStylesheet}
      </style>
      {/* biome-ignore lint/a11y/useSemanticElements: <fieldset> implies form-control semantics
          and an optional <legend>, neither of which fits a plain toolbar of buttons. */}
      <div {...rest} role="group" className={classes}>
        {children}
      </div>
    </>
  );
}
