import type { ReactNode } from "react";
import { Text, type YAxisTickContentProps } from "recharts";
import type { ChartYFormatter } from "../types.js";

/**
 * Recharts centres one line's capitals on its tick by dropping the baseline 0.355em below it, half
 * a 0.71em cap height. Two 1em lines keep that centre by sitting half a line either side of it: the
 * value's baseline 0.5em above the single line's, the unit's one line below the value's.
 */
const VALUE_DY = "-0.145em";
const UNIT_DY = "1em";

/**
 * The one class Recharts' default tick carries, without the axis's own classes it hands a custom
 * tick. Recharts also reads the tick font's size from the first element with this class.
 */
const TICK_CLASS = "recharts-cartesian-axis-tick-value";

/**
 * The y axis's tick, drawing what `format` returns for the tick's value. A string goes through
 * Recharts' own `Text`, given every prop and the class Recharts' default tick gives it, so it
 * renders exactly as that default does. A `[value, unit]` pair is one `<text>` of two lines, the value above the
 * unit, each starting at the tick's `x` so both take the axis's `textAnchor`, in the tick's fill
 * and the inherited font.
 */
export function yAxisTick(format: ChartYFormatter) {
  return function YAxisTick(props: YAxisTickContentProps): ReactNode {
    const tick = format(props.payload.value);
    if (typeof tick === "string") {
      return (
        <Text {...props} className={TICK_CLASS}>
          {tick}
        </Text>
      );
    }
    const [value, unit] = tick;
    const { x, y, textAnchor, fill, stroke } = props;
    return (
      <text x={x} y={y} className={TICK_CLASS} textAnchor={textAnchor} fill={fill} stroke={stroke}>
        <tspan x={x} dy={VALUE_DY}>
          {value}
        </tspan>
        <tspan x={x} dy={UNIT_DY}>
          {unit}
        </tspan>
      </text>
    );
  };
}
