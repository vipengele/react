import { AlertCircle, Check, type IconComponent, Info } from "@vipengele/react-icons";
import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import { statTileStylesheet } from "./StatTile.stylesheet.js";

export type StatTileTone = "neutral" | "success" | "warning" | "info" | "danger";

/** The tones that carry a glyph and a tone label. */
export type StatTileStatusTone = Exclude<StatTileTone, "neutral">;

interface StatTileBaseProps extends Omit<ComponentPropsWithRef<"div">, "children" | "placeholder"> {
  /** The eyebrow that names the figure. It labels the tile's group. */
  label: ReactNode;
  /** The figure itself. `null` and `undefined` render `placeholder`; every other value, `0` and
   * `""` included, renders as given. */
  value: ReactNode;
  /** A line under the value: a unit, a comparison, a period. */
  supporting?: ReactNode;
  /** A trailing node beside the text, such as a sparkline. The tile places its wrapper and leaves
   * the node's own styles alone. */
  visual?: ReactNode;
  /** Rendered in place of a missing value, in the value's font metrics. */
  placeholder?: ReactNode;
}

export interface StatTileNeutralProps extends StatTileBaseProps {
  tone?: "neutral";
  toneLabel?: never;
}

export interface StatTileStatusProps extends StatTileBaseProps {
  tone: StatTileStatusTone;
  /** What the tone means, announced after the label. The glyph is hidden from assistive
   * technology, so this is the tone's only non-visual expression. */
  toneLabel: string;
}

export type StatTileProps = StatTileNeutralProps | StatTileStatusProps;

/** The glyph each status tone draws on its disc. A neutral tile draws none. */
const toneIcons: Record<StatTileStatusTone, IconComponent> = {
  success: Check,
  warning: AlertCircle,
  info: Info,
  danger: AlertCircle,
};

/**
 * A static figure with an eyebrow label, a monospace value, an optional supporting line, a tone and
 * a trailing visual slot. The root is a group named by the label, read in the order label, tone
 * label, value, supporting text. A consumer's `aria-label` or `aria-labelledby` names the group
 * instead of the label.
 */
export function StatTile(props: StatTileProps) {
  const {
    tone = "neutral",
    toneLabel,
    label,
    value,
    supporting,
    visual,
    placeholder = "—",
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...rest
  } = props;
  const labelId = useId();
  const missing = value === null || value === undefined;
  const Glyph = tone === "neutral" ? undefined : toneIcons[tone];
  const classes = ["vpg-stat-tile", `vpg-stat-tile-${tone}`, className].filter(Boolean).join(" ");
  // `aria-labelledby` outranks `aria-label` in the accessible name, so a consumer's `aria-label`
  // only names the group when the tile points at no label of its own.
  const labelledBy = ariaLabelledBy ?? (ariaLabel === undefined ? labelId : undefined);

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N tiles on a page inject one
        stylesheet.
      */}
      <style href="vpg-stat-tile" precedence="vpg-stat-tile">
        {statTileStylesheet}
      </style>
      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> implies form-control semantics and carries its own chrome; a tile that groups a figure with its label is a plain role="group" */}
      <div {...rest} className={classes} role="group" aria-label={ariaLabel} aria-labelledby={labelledBy}>
        <div className="vpg-stat-tile-body">
          <div className="vpg-stat-tile-header">
            <div id={labelId} className="vpg-stat-tile-label">
              {label}
            </div>
            {Glyph === undefined ? null : <Glyph className="vpg-stat-tile-icon" aria-hidden="true" />}
          </div>
          {Glyph === undefined || toneLabel === undefined ? null : <span className="vpg-stat-tile-visually-hidden">{toneLabel}</span>}
          <div className={missing ? "vpg-stat-tile-value vpg-stat-tile-placeholder" : "vpg-stat-tile-value"}>
            {missing ? placeholder : value}
          </div>
          {supporting === undefined || supporting === null ? null : <div className="vpg-stat-tile-supporting">{supporting}</div>}
        </div>
        {visual === undefined || visual === null ? null : <div className="vpg-stat-tile-visual">{visual}</div>}
      </div>
    </>
  );
}
