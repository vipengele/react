// Proves the tree-shaking claim end-to-end: bundles a standalone downstream consumer (see
// `entry.js`) that imports only `LineChart` from this package's built `dist/` output, then
// inspects the resulting bundle for the presence of that component, of the
// `ThemedChartContainer` it renders inside, of Recharts' `ResponsiveContainer` and `Line`, and of
// the store, scale and immutability libraries every Recharts chart is built on, and for the
// absence of every other Recharts chart type. A size/shape check on this package's own `dist`
// output couldn't tell this apart from a re-export that drags all of Recharts in — this has to
// be a real downstream build, with Recharts bundled rather than externalised so that its
// tree-shaking is what is exercised.
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

const code = await bundle("entry.js");

assert.ok(code.includes("vpg-chart-line"), "the requested component (LineChart) is missing from the bundle");
assert.ok(code.includes("vpg-chart-container"), "ThemedChartContainer is missing from the bundle, though LineChart renders inside one");
assert.ok(
  code.includes("recharts-responsive-container"),
  "Recharts' ResponsiveContainer is missing from the bundle, though LineChart renders one",
);

// Every marker is a class name the chart type's own module passes to the elements it renders: a
// string literal, so no bundler renames it, and one no other Recharts module contains. The
// unminified bundle keeps a `//#region` comment naming each bundled file's path, so a marker is
// never a bare chart name such as `PieChart`, which those paths contain.
const lineMarkers = [
  { name: "Line", marker: "recharts-line-curve" },
  { name: "Line", marker: "recharts-line-dots" },
];
for (const { name, marker } of lineMarkers) {
  assert.ok(code.includes(marker), `Recharts' ${name} is missing from the bundle, though LineChart draws one (no "${marker}")`);
}

const chartMarkers = [
  { name: "Area", marker: "recharts-area-dots" },
  { name: "Bar", marker: "recharts-bar-rectangle" },
  { name: "Scatter", marker: "recharts-scatter-symbol" },
  { name: "Pie", marker: "recharts-pie-sector" },
  { name: "Radar", marker: "recharts-radar-polygon" },
  { name: "RadialBar", marker: "recharts-radial-bar-sector" },
  { name: "Funnel", marker: "recharts-funnel-trapezoid" },
  { name: "Treemap", marker: "recharts-treemap-nest-index-box" },
  { name: "Sankey", marker: "recharts-sankey-link" },
  { name: "SunburstChart", marker: "recharts-sunburst" },
];
for (const { name, marker } of chartMarkers) {
  assert.ok(!code.includes(marker), `Recharts' ${name} leaked into a bundle that only imported LineChart (found "${marker}")`);
}

// Recharts 3 charts are driven by a Redux store and draw through d3 scales and shapes, so all of
// it arrives with the first chart type: a `LineChart` bundle without it is not bundling a working
// Recharts chart, and the size this check reports would understate what a consumer ships. The
// chart shell's class name and a runtime string from each library stand for them; no bundler
// renames a string literal.
const chartInfrastructureMarkers = [
  { name: "the Recharts chart wrapper", marker: "recharts-wrapper" },
  { name: "redux", marker: "@@redux/INIT" },
  { name: "immer", marker: "[Immer]" },
  { name: "d3-format", marker: "invalid format: " },
];
for (const { name, marker } of chartInfrastructureMarkers) {
  assert.ok(code.includes(marker), `${name} is missing from the bundle, though LineChart is built on it (no "${marker}")`);
}

// The positive control for every absence check above: a bundle that also imports each of those
// chart types carries every marker, so their absence from the LineChart bundle is a tree-shaking
// result rather than a marker that never appears in any bundle.
const chartsCode = await bundle("entry-charts.js");
assert.ok(chartsCode.includes("vpg-chart-line"), "the requested component (LineChart) is missing from the charts bundle");
for (const { name, marker } of chartMarkers) {
  assert.ok(
    chartsCode.includes(marker),
    `${name} is missing from the bundle that imports it (no "${marker}"), so its marker detects nothing`,
  );
}

console.log(
  `bundle-check passed (${code.length} bytes): LineChart bundled its container, ResponsiveContainer, Line and the Recharts store and d3, with no other Recharts chart type; the charts bundle (${chartsCode.length} bytes) carries every one.`,
);
