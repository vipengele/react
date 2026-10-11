// A downstream consumer importing both of this package's charts alongside every Recharts chart
// type whose marker `run.mjs` asserts absent from a single-chart bundle: the positive control
// proving each of those markers does appear in a bundle that genuinely needs it. Recharts' own
// `Line`, `Area` and `ReferenceLine` are imported directly, so the control carries their markers
// whatever this package's charts happen to render; its chart components are aliased where their
// names clash with this package's exports.
export { AreaChart, LineChart } from "../dist/index.js";
export {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart,
  Funnel,
  FunnelChart,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  Sankey,
  Scatter,
  ScatterChart,
  SunburstChart,
  Treemap,
} from "recharts";
