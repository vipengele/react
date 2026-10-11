import type { CSSProperties, Ref } from "react";
import type { ChartMessages, ChartStatus } from "../types.js";

const DEFAULT_MESSAGES = {
  loading: "Loading chart",
  empty: "No data to show",
  error: "Could not load chart",
} as const satisfies Record<Exclude<ChartStatus, "ready">, string>;

export interface ChartMessageProps {
  status: Exclude<ChartStatus, "ready">;
  messages: ChartMessages | undefined;
  height: number | `${number}%` | undefined;
  aspect: number | undefined;
  className: string | undefined;
  ref: Ref<HTMLDivElement> | undefined;
}

/**
 * Stands in for a chart that is not ready: the status' message, the caller's or the default,
 * announced as an alert for `"error"` and as a status otherwise. It takes the size the chart
 * would: a height, else the aspect, else the parent's full height.
 */
export function ChartMessage({ status, messages, height, aspect, className, ref }: ChartMessageProps) {
  const style: CSSProperties = { width: "100%", height: height ?? (aspect === undefined ? "100%" : undefined), aspectRatio: aspect };
  return (
    <div ref={ref} className={["vpg-chart-message", className].filter(Boolean).join(" ")} style={style}>
      <p role={status === "error" ? "alert" : "status"} className="vpg-chart-message-text">
        {messages?.[status] ?? DEFAULT_MESSAGES[status]}
      </p>
    </div>
  );
}
