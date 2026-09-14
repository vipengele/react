// Proves the tree-shaking claim end-to-end: bundles a standalone downstream consumer (see
// `entry.js`) that imports exactly one named component from this package's built `dist/` output,
// then inspects the resulting bundle for the presence of that component and of the components it
// genuinely depends on, and the absence of every other component in the package. A size/shape
// check on this package's own `dist` output couldn't tell this apart from a barrel re-export that
// happens to be small — this has to be a real downstream build.
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

assert.ok(
  code.includes(".tandiko-button {"),
  "the requested component (Button) is missing from the bundle",
);

// Spinner is the one component expected to travel with Button: `loading` swaps the button's
// content for an inline `<Spinner>`, so a bundle without it would mean the dependency is dead.
assert.ok(
  code.includes("@keyframes tandiko-spinner-rotate"),
  "Spinner is missing from the bundle, though Button renders one while loading",
);

// Each component that lands after Button adds its own entry here, in the same change that ships
// the component; the claim is only fully proven once the last one lands.
const unrelatedComponents = [
  { name: "Typography", marker: ".tandiko-typography {" },
  { name: "ButtonGroup", marker: ".tandiko-button-group {" },
  { name: "Avatar", marker: ".tandiko-avatar {" },
  { name: "Skeleton", marker: ".tandiko-skeleton {" },
  { name: "Card", marker: ".tandiko-card {" },
  { name: "Progress", marker: ".tandiko-progress {" },
];
for (const { name, marker } of unrelatedComponents) {
  assert.ok(
    !code.includes(marker),
    `unrelated component "${name}" leaked into a bundle that only imported Button`,
  );
}

console.log(`bundle-check passed (${code.length} bytes): only Button and Spinner were bundled.`);
