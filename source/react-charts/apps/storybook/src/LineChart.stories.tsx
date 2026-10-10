import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineChart, type LineChartProps, type LineChartRow, type LineChartZoom } from "@vipengele/react-charts";
import { useState } from "react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const visits = [40, 65, 52, 88, 74, 91, 83, 110];
const signups = [12, 18, 15, 30, 26, 34, 29, 41];

const monthly: LineChartRow[] = visits.map((value, i) => ({ month: i + 1, visits: value, signups: signups[i] }));

const monthLabel = (x: number) => months[x - 1] ?? String(x);

const gappy: LineChartRow[] = monthly.map((row, i) => (i === 3 || i === 4 ? { ...row, visits: null, signups: null } : row));

const HOUR_MS = 3_600_000;
const start = Date.UTC(2026, 0, 1, 0, 0, 0);

/** A day of per-minute-ish samples every 30 minutes, with two series that rise and fall. */
const traffic: LineChartRow[] = Array.from({ length: 48 }, (_, i) => ({
  at: start + i * (HOUR_MS / 2),
  rx: Math.round(500 + 300 * Math.sin(i / 5) + (i % 7) * 20),
  tx: Math.round(200 + 120 * Math.cos(i / 4) + (i % 5) * 10),
}));

const formatClock = (x: number) =>
  new Date(x).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

const formatBytes = (y: number) => `${y} kB/s`;

const meta: Meta<typeof LineChart> = {
  title: "Components/LineChart",
  component: LineChart,
  args: {
    data: monthly,
    xKey: "month",
    series: [{ key: "visits", label: "Visits" }],
    height: 240,
    formatX: monthLabel,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "36rem", maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LineChart>;

export const OneSeries: Story = {};

export const TwoSeries: Story = {
  args: {
    series: [
      { key: "visits", label: "Visits" },
      { key: "signups", label: "Signups" },
    ],
  },
};

export const GapsLeftOpen: Story = {
  args: {
    data: gappy,
    series: [
      { key: "visits", label: "Visits" },
      { key: "signups", label: "Signups" },
    ],
    connectGaps: false,
  },
};

export const GapsConnected: Story = {
  args: { ...GapsLeftOpen.args, connectGaps: true },
};

export const NumericX: Story = {
  args: {
    data: Array.from({ length: 21 }, (_, i) => ({ x: i, y: i * i })),
    xKey: "x",
    xKind: "number",
    series: [{ key: "y", label: "x squared" }],
    formatX: undefined,
  },
};

export const TimeX: Story = {
  args: {
    data: traffic,
    xKey: "at",
    xKind: "time",
    series: [
      { key: "rx", label: "Received" },
      { key: "tx", label: "Sent" },
    ],
    formatX: formatClock,
    formatTooltipLabel: (x) => `${formatClock(x)} UTC`,
    formatY: formatBytes,
  },
};

export const Loading: Story = {
  args: { status: "loading" },
};

export const Empty: Story = {
  args: { status: "empty", data: [] },
};

export const ErrorState: Story = {
  args: { status: "error" },
};

export const CustomMessages: Story = {
  args: {
    status: "empty",
    data: [],
    messages: { empty: "Nothing recorded for this period" },
  },
};

export const PinnedColor: Story = {
  args: {
    series: [
      { key: "visits", label: "Visits", colorIndex: 4 },
      { key: "signups", label: "Signups", colorIndex: 2 },
    ],
  },
};

const sharedSeries: LineChartProps["series"] = [
  { key: "rx", label: "Received" },
  { key: "tx", label: "Sent", colorIndex: 3 },
];

/** Two charts reading one controlled zoom: a drag on either narrows both, and reset clears both. */
function SharedZoom() {
  const [zoom, setZoom] = useState<LineChartZoom | null>(null);
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <LineChart
        data={traffic}
        xKey="at"
        xKind="time"
        series={sharedSeries}
        height={200}
        formatX={formatClock}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      <LineChart
        data={traffic}
        xKey="at"
        xKind="time"
        series={[{ key: "rx", label: "Received" }]}
        height={200}
        formatX={formatClock}
        zoom={zoom}
        onZoomChange={setZoom}
      />
    </div>
  );
}

export const SharedControlledZoom: Story = {
  render: () => <SharedZoom />,
};
