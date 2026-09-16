import type { InputHTMLAttributes } from "react";
import { sliderStylesheet } from "./Slider.stylesheet.js";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

/**
 * A native `<input type="range">` styled as a single-thumb slider. It forwards every `<input>`
 * prop except `type`, so `min`/`max`/`step`, `value`/`onChange` (controlled) or `defaultValue`
 * (uncontrolled), and `disabled` all work exactly as they do on a plain range input. No custom
 * keyboard or pointer handling: the native element already handles arrow-key stepping, dragging,
 * touch, and form participation for free.
 */
export function Slider({ className, ...rest }: SliderProps) {
  const classes = ["tandiko-slider", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N sliders on a page inject one
        stylesheet.
      */}
      <style href="tandiko-slider" precedence="tandiko-slider">
        {sliderStylesheet}
      </style>
      <input type="range" {...rest} className={classes} />
    </>
  );
}
