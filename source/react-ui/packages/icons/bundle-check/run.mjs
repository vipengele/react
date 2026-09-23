// Proves the tree-shaking claim end-to-end: bundles a standalone downstream consumer (see
// `entry.js`) that imports exactly one named icon from this package's built `dist/` output,
// then inspects the resulting bundle for the presence of only that icon and the absence of
// every other curated icon and of the wider `lucide-react` set. A size/shape check on this
// package's own `dist` output couldn't tell this apart from a barrel re-export that happens to
// be small — this has to be a real downstream build.
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

const [output] = await build({
  root: here,
  logLevel: "silent",
  build: {
    write: false,
    minify: false,
    lib: {
      entry: path.join(here, "entry.js"),
      formats: ["es"],
      fileName: () => "bundle.js",
    },
    rollupOptions: {
      // Peers, not bundled content — irrelevant to what this check inspects.
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
});

const chunk = output.output.find((item) => item.type === "chunk");
assert.ok(chunk, "expected vite to emit a JS chunk for the bundle-check entry");
const code = chunk.code;

assert.ok(code.includes('"chevron-down"'), "the requested icon (ChevronDown) is missing from the bundle");

const unrelatedCuratedIcons = [
  "chevron-up",
  "chevron-left",
  "chevron-right",
  "check",
  "x",
  "arrow-right",
  "arrow-left",
  "search",
  "plus",
  "minus",
  "external-link",
  "circle-alert",
  "info",
  "loader-circle",
  "user",
];
for (const name of unrelatedCuratedIcons) {
  assert.ok(!code.includes(`"${name}"`), `unrelated curated icon "${name}" leaked into a bundle that only imported ChevronDown`);
}

// Never curated at all — its presence would mean the full lucide-react icon set got bundled.
const uncuratedLucideIcons = ["smile-plus", "square-arrow-right", "user-round-search"];
for (const name of uncuratedLucideIcons) {
  assert.ok(
    !code.includes(`"${name}"`),
    `an icon outside the curated set ("${name}") leaked into the bundle — the full lucide-react set was bundled`,
  );
}

console.log(`bundle-check passed (${code.length} bytes): only ChevronDown was bundled.`);
