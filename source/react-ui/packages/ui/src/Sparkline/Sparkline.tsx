import type { ComponentPropsWithRef } from "react";
import type { StatTileTone } from "../StatTile/StatTile.js";
import {
  computeSparkline,
  describeTrend,
  SPARKLINE_VIEWBOX,
  SPARKLINE_VIEWBOX_HEIGHT,
  SPARKLINE_VIEWBOX_WIDTH,
  type SparklinePoint,
} from "./geometry.js";
import { sparklineStylesheet } from "./Sparkline.stylesheet.js";

/** The colour a sparkline is drawn in: the tones of `StatTile`, so a sparkline matches its tile. */
export type SparklineTone = StatTileTone;

export interface SparklineProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The series, in order. `null`, `undefined` and non-finite entries are absent: they keep their
   * horizontal slot and split the line into separate segments, never interpolated across. */
  values: ReadonlyArray<number | null | undefined>;
  /** The colour of the stroke, the area wash and the dots. */
  tone?: SparklineTone;
  /** The drawing's height in px. The width follows the container. */
  height?: number;
  /** Names the series ahead of the generated trend text, joined by a full stop:
   * `label="Revenue"` reads "Revenue. Trend: rising, from 12 to 31". */
  label?: string;
  /** The whole accessible name, used instead of the generated trend text and `label`. */
  summary?: string;
  /** Hides the sparkline from assistive technology, for one whose neighbouring text already says
   * what it shows. It then carries no role and no name. */
  decorative?: boolean;
  /** The locale the numbers in the generated trend text are formatted for. */
  locale?: string;
}

/** A viewBox point as percentages of the box, for an absolutely positioned dot. */
function dotPosition(point: SparklinePoint) {
  return {
    left: `${(point.x / SPARKLINE_VIEWBOX_WIDTH) * 100}%`,
    top: `${(point.y / SPARKLINE_VIEWBOX_HEIGHT) * 100}%`,
  };
}

/**
 * A small axis-less line of a series, with an area wash and an emphasised end point, for tiles and
 * table cells. It fills the width it is given at a fixed height. The root is an image named by a
 * generated trend summary, such as "Trend: rising, from 12 to 31"; the drawing itself is hidden
 * from assistive technology.
 */
export function Sparkline(props: SparklineProps) {
  const { values, tone = "neutral", height = 32, label, summary, decorative = false, locale, className, ...rest } = props;
  const { segments, lastPoint, dot } = computeSparkline(values);
  const classes = ["vpg-sparkline", `vpg-sparkline-${tone}`, className].filter(Boolean).join(" ");
  const name = summary ?? (label === undefined ? describeTrend(values, locale) : `${label}. ${describeTrend(values, locale)}`);
  const isolated = segments
    .flatMap((segment) => (segment.points.length === 1 ? segment.points : []))
    .filter((point) => point !== lastPoint);

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N sparklines on a page inject one
        stylesheet.
      */}
      <style href="vpg-sparkline" precedence="vpg-sparkline">
        {sparklineStylesheet}
      </style>
      <div {...rest} className={classes} {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}>
        <svg
          className="vpg-sparkline-svg"
          aria-hidden="true"
          focusable="false"
          width="100%"
          height={height}
          viewBox={SPARKLINE_VIEWBOX}
          preserveAspectRatio="none"
        >
          {segments.map((segment) =>
            segment.line === null || segment.area === null ? null : (
              <g key={(segment.points[0] as SparklinePoint).index}>
                <path className="vpg-sparkline-area" d={segment.area} />
                <path className="vpg-sparkline-line" d={segment.line} />
              </g>
            ),
          )}
        </svg>
        {isolated.map((point) => (
          <span key={point.index} className="vpg-sparkline-dot" style={dotPosition(point)} />
        ))}
        {dot === null ? null : <span className="vpg-sparkline-dot vpg-sparkline-dot-end" style={{ left: `${dot.x}%`, top: `${dot.y}%` }} />}
      </div>
    </>
  );
}
