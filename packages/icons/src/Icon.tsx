import { iconStylesheet } from "./icon-stylesheet.js";
import type { IconComponent } from "./types.js";

export interface IconProps {
  /** The glyph to render. Consumers pass the component itself — `<Icon icon={ChevronDown} />` —
   * never a name, so a bundler only ever sees the icons actually referenced. */
  icon: IconComponent;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
}

/**
 * Renders a curated icon at a consistent default size/stroke, driven by
 * `--tandiko-icon-size-md`/`--tandiko-icon-stroke-md`. An explicit `size` or `strokeWidth` prop
 * is forwarded straight to the glyph, which sets it as an SVG attribute lucide's own way — the
 * matching default class is withheld in that case, since a CSS rule (even from a class) beats
 * an SVG presentation attribute on specificity and would otherwise silently win over the prop.
 */
export function Icon({ icon: Glyph, size, strokeWidth, className }: IconProps) {
  const classes = [
    size === undefined ? "tandiko-icon-size-default" : undefined,
    strokeWidth === undefined ? "tandiko-icon-stroke-default" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N icons on a page inject one
        stylesheet. Injecting the CSS as a string rather than importing a `.css` file keeps the
        package free of the import side effect that `"sideEffects": false` would otherwise have
        to carve an exception for.
      */}
      <style href="tandiko-icon-base" precedence="tandiko-icon-base">
        {iconStylesheet}
      </style>
      <Glyph
        size={size}
        strokeWidth={strokeWidth}
        className={classes.length > 0 ? classes : undefined}
      />
    </>
  );
}
