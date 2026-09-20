import type { InputHTMLAttributes } from "react";
import { toggleStylesheet } from "./Toggle.stylesheet.js";

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {}

/**
 * A native `<input type="checkbox" role="switch">` styled as a switch. No custom keyboard
 * handling and no hand-set `aria-checked`: the native element's own `checked` state already
 * exposes it, and a hand-set `aria-checked` would go stale in the uncontrolled
 * (`defaultChecked`) case, where a click updates the DOM's `checked` property without
 * triggering a re-render.
 */
export function Toggle({ className, ...rest }: ToggleProps) {
  const classes = ["vpg-toggle", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N toggles on a page inject one
        stylesheet.
      */}
      <style href="vpg-toggle" precedence="vpg-toggle">
        {toggleStylesheet}
      </style>
      {/* biome-ignore lint/a11y/useAriaPropsForRole: hand-setting aria-checked here would go stale in the uncontrolled (defaultChecked) case, where a click updates the DOM's checked property without a re-render; the native input's own checked state already exposes it */}
      <input type="checkbox" role="switch" {...rest} className={classes} />
    </>
  );
}
