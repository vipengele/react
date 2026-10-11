// Proves the tree-shaking claim end-to-end, once per chart type: bundles a standalone downstream
// consumer importing only `LineChart` (`entry.js`) and one importing only `AreaChart`
// (`entry-area.js`) from this package's built `dist/` output. Each bundle must carry that
// component, the `ThemedChartContainer` it renders inside, Recharts' `ResponsiveContainer`, the
// Recharts parts that chart draws with, and the store, scale and immutability libraries every
// Recharts chart is built on; it must carry neither the other chart's code nor the Recharts parts
// only the other chart draws with, nor any other Recharts chart type. A size/shape check on this
// package's own `dist` output couldn't tell this apart from a re-export that drags all of Recharts
// in — this has to be a real downstream build, with Recharts bundled rather than externalised so
// that its tree-shaking is what is exercised.
// This is a standalone Node script (`node bundle-check/run.mjs`), never bundled into the
// package's published dist/ — the noNodejsModules rule exists to keep Node built-ins out of
// code that ships to consumers, which this deliberately is not.
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import assert from "node:assert/strict";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import path from "node:path";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

// Builds `entryFile` as a downstream consumer would and returns the emitted JS.
async function bundle(entryFile) {
  const [output] = await build({
    root: here,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      lib: {
        entry: path.join(here, entryFile),
        formats: ["es"],
        fileName: () => "bundle.js",
      },
      rollupOptions: {
        // React and `react-is` (Recharts' own peer) are irrelevant to what this check inspects.
        // Recharts is a dependency, so it is bundled: dropping its unused modules is the claim.
        external: ["react", "react-dom", "react/jsx-runtime", "react-is"],
      },
    },
  });

  const chunk = output.output.find((item) => item.type === "chunk");
  assert.ok(chunk, `expected vite to emit a JS chunk for the bundle-check entry ${entryFile}`);
  return chunk.code;
}

// Asserts every `present` marker appears in `code` and no `absent` marker does. `label` names the
// bundle in the failure message.
function assertBundle(label, code, { present = [], absent = [] }) {
  for (const { name, marker } of present) {
    assert.ok(code.includes(marker), `${name} is missing from the ${label} bundle (no "${marker}")`);
  }
  for (const { name, marker } of absent) {
    assert.ok(!code.includes(marker), `${name} leaked into the ${label} bundle (found "${marker}")`);
  }
}

// Every marker is a class name a module passes to the elements it renders: a string literal, so no
// bundler renames it, and one no other module contains. The unminified bundle keeps a `//#region`
// comment naming each bundled file's path, so a marker is never a bare chart name such as
// `PieChart`, which those paths contain.
const lineChartMarkers = [{ name: "LineChart", marker: "vpg-chart-line" }];
const areaChartMarkers = [
  { name: "AreaChart", marker: "vpg-chart-area" },
  { name: "AreaChart's zero line", marker: "vpg-chart-zero-line" },
];
const containerMarkers = [
  { name: "ThemedChartContainer", marker: "vpg-chart-container" },
  { name: "Recharts' ResponsiveContainer", marker: "recharts-responsive-container" },
];
const rechartsLineMarkers = [
  { name: "Recharts' Line", marker: "recharts-line-curve" },
  { name: "Recharts' Line", marker: "recharts-line-dots" },
];
// `recharts-area-area` and `recharts-area-curve` come from the shape module `Area` draws through,
// `recharts-area-dots` from `Area` itself.
const rechartsAreaMarkers = [
  { name: "Recharts' Area", marker: "recharts-area-area" },
  { name: "Recharts' Area", marker: "recharts-area-curve" },
  { name: "Recharts' Area", marker: "recharts-area-dots" },
];
const rechartsReferenceLineMarkers = [{ name: "Recharts' ReferenceLine", marker: "recharts-reference-line" }];
const otherChartMarkers = [
  { name: "Recharts' Bar", marker: "recharts-bar-rectangle" },
  { name: "Recharts' Scatter", marker: "recharts-scatter-symbol" },
  { name: "Recharts' Pie", marker: "recharts-pie-sector" },
  { name: "Recharts' Radar", marker: "recharts-radar-polygon" },
  { name: "Recharts' RadialBar", marker: "recharts-radial-bar-sector" },
  { name: "Recharts' Funnel", marker: "recharts-funnel-trapezoid" },
  { name: "Recharts' Treemap", marker: "recharts-treemap-nest-index-box" },
  { name: "Recharts' Sankey", marker: "recharts-sankey-link" },
  { name: "Recharts' SunburstChart", marker: "recharts-sunburst" },
];

// Recharts 3 charts are driven by a Redux store and draw through d3 scales and shapes, so all of
// it arrives with the first chart type: a single-chart bundle without it is not bundling a working
// Recharts chart, and the size this check reports would understate what a consumer ships. The
// chart shell's class name and a runtime string from each library stand for them; no bundler
// renames a string literal.
const chartInfrastructureMarkers = [
  { name: "the Recharts chart wrapper", marker: "recharts-wrapper" },
  { name: "redux", marker: "@@redux/INIT" },
  { name: "immer", marker: "[Immer]" },
  { name: "d3-format", marker: "invalid format: " },
];

// LineChart draws Recharts' `Line`; AreaChart draws `Area` and a `ReferenceLine` at zero. Each
// chart's bundle carries its own parts and none of the other's.
const lineCode = await bundle("entry.js");
const lineAbsent = [...areaChartMarkers, ...rechartsAreaMarkers, ...rechartsReferenceLineMarkers, ...otherChartMarkers];
assertBundle("LineChart-only", lineCode, {
  present: [...lineChartMarkers, ...containerMarkers, ...rechartsLineMarkers, ...chartInfrastructureMarkers],
  absent: lineAbsent,
});

const areaCode = await bundle("entry-area.js");
const areaAbsent = [...lineChartMarkers, ...rechartsLineMarkers, ...otherChartMarkers];
assertBundle("AreaChart-only", areaCode, {
  present: [
    ...areaChartMarkers,
    ...containerMarkers,
    ...rechartsAreaMarkers,
    ...rechartsReferenceLineMarkers,
    ...chartInfrastructureMarkers,
  ],
  absent: areaAbsent,
});

// The positive control for every absence check above: a bundle that imports each of those chart
// types carries every marker, so its absence from a single-chart bundle is a tree-shaking result
// rather than a marker that never appears in any bundle.
const chartsCode = await bundle("entry-charts.js");
const controlled = [...new Map([...lineAbsent, ...areaAbsent].map((entry) => [entry.marker, entry])).values()];
assertBundle("all-charts control", chartsCode, { present: controlled });

console.log(
  `bundle-check passed: the LineChart-only bundle (${lineCode.length} bytes) carries its container, ResponsiveContainer, Line and the Recharts store and d3, with no Area, ReferenceLine or other chart type; the AreaChart-only bundle (${areaCode.length} bytes) carries its container, ResponsiveContainer, Area, ReferenceLine and the Recharts store and d3, with no Line or other chart type; the all-charts control (${chartsCode.length} bytes) carries all ${controlled.length} markers asserted absent.`,
);
