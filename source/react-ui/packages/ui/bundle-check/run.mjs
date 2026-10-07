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
        // Peers, not bundled content — irrelevant to what this check inspects, except
        // `@vipengele/react-telemetry`, whose absence is asserted below.
        external: ["react", "react-dom", "react/jsx-runtime", "@vipengele/react-telemetry"],
        treeshake: {
          // An external is assumed to have side effects, so an unused import of it survives as a
          // bare `import "…"`. A real consumer resolves `@vipengele/react-telemetry` and reads its
          // `"sideEffects": false`, which drops that import; this rule gives the external the same
          // standing, so the import is in the bundle only when something in it uses telemetry.
          moduleSideEffects: [{ test: /^@vipengele\/react-telemetry$/, external: true, sideEffects: false }],
        },
      },
    },
  });

  const chunk = output.output.find((item) => item.type === "chunk");
  assert.ok(chunk, `expected vite to emit a JS chunk for the bundle-check entry ${entryFile}`);
  return chunk.code;
}

const code = await bundle("entry.js");

assert.ok(code.includes(".vpg-button {"), "the requested component (Button) is missing from the bundle");

// Spinner is the one component expected to travel with Button: `loading` swaps the button's
// content for an inline `<Spinner>`, so a bundle without it would mean the dependency is dead.
assert.ok(code.includes("@keyframes vpg-spinner-rotate"), "Spinner is missing from the bundle, though Button renders one while loading");

// Each component that lands after Button adds its own entry here, in the same change that ships
// the component; the claim is only fully proven once the last one lands.
const unrelatedComponents = [
  { name: "Typography", marker: ".vpg-typography {" },
  { name: "ButtonGroup", marker: ".vpg-button-group {" },
  { name: "Avatar", marker: ".vpg-avatar {" },
  { name: "Skeleton", marker: ".vpg-skeleton {" },
  { name: "StatePanel", marker: ".vpg-state-panel {" },
  { name: "Card", marker: ".vpg-card {" },
  { name: "FieldSet", marker: ".vpg-fieldset {" },
  { name: "FormField", marker: ".vpg-form-field {" },
  { name: "Progress", marker: ".vpg-progress {" },
  { name: "Tabs", marker: ".vpg-tabs {" },
  { name: "Tooltip", marker: ".vpg-tooltip {" },
  { name: "Popover", marker: ".vpg-popover {" },
  { name: "Menu", marker: ".vpg-menu {" },
  { name: "Toggle", marker: ".vpg-toggle {" },
  { name: "TextField", marker: ".vpg-text-field {" },
  { name: "PasswordInput", marker: ".vpg-password-input-toggle {" },
  { name: "RadioButton", marker: ".vpg-radio-button {" },
  { name: "RadioGroup", marker: ".vpg-radio-group {" },
  { name: "Checkbox", marker: ".vpg-checkbox {" },
  { name: "Slider", marker: ".vpg-slider {" },
  { name: "Dropdown", marker: ".vpg-dropdown {" },
  { name: "FieldShell", marker: ".vpg-field-shell {" },
  { name: "Textarea", marker: ".vpg-textarea {" },
  { name: "Stack", marker: ".vpg-stack {" },
  { name: "Inline", marker: ".vpg-inline {" },
  { name: "Center", marker: ".vpg-center {" },
  // ErrorBoundary ships no stylesheet — its default fallback borrows StatePanel's, and
  // StatePanel's own marker above already proves that. Its marker is the string React's
  // static class-field convention emits verbatim for `getDerivedStateFromError`: present in
  // this package's source, absent from a Button-only bundle, and — because this build runs
  // with `minify: false` — not renamed away the way a minifier would rename a local identifier.
  { name: "ErrorBoundary", marker: "getDerivedStateFromError" },
  { name: "Link", marker: ".vpg-link {" },
  { name: "NumberInput", marker: ".vpg-number-input {" },
  // Grid and GridItem share one stylesheet, so its marker stands for both.
  { name: "Grid and GridItem", marker: ".vpg-grid-fit {" },
  { name: "Badge", marker: ".vpg-badge {" },
  { name: "AspectRatio", marker: ".vpg-aspect-ratio {" },
  { name: "Tag", marker: ".vpg-tag {" },
  { name: "Tree", marker: ".vpg-tree {" },
  { name: "Dialog", marker: ".vpg-dialog {" },
  // ConfirmDialog ships no stylesheet — it composes Dialog, Button, Stack, Inline and Typography,
  // whose markers above prove them. Its marker is the `alertdialog` role literal it alone passes
  // to Dialog, a string no bundler renames.
  { name: "ConfirmDialog", marker: '"alertdialog"' },
  { name: "SegmentedControl", marker: ".vpg-segmented-control {" },
  { name: "FileInput", marker: ".vpg-file-input {" },
  // Table is a compound component: a Button-only bundle that carries its marker means the
  // `/* @__PURE__ */` annotation on its `Object.assign` export is missing or ineffective.
  { name: "Table", marker: ".vpg-table {" },
  { name: "Breadcrumbs", marker: ".vpg-breadcrumbs {" },
  { name: "Disclosure", marker: ".vpg-disclosure {" },
  { name: "Accordion", marker: ".vpg-accordion {" },
  // The shared listbox/option/checkbox/chip stylesheet lives in `src/internal/`, not in one
  // component's directory, so it has its own marker: a bundle that dropped every component still
  // importing it would be a tree-shaking regression the component markers above can't see.
  { name: "the shared internal listbox stylesheet", marker: ".vpg-listbox {" },
];
for (const { name, marker } of unrelatedComponents) {
  assert.ok(!code.includes(marker), `unrelated component "${name}" leaked into a bundle that only imported Button`);
}

// `@floating-ui/react` is a real runtime dependency, reachable from the package's entry through
// Tooltip and Popover. It is the only third-party runtime code in the package big enough for a
// tree-shaking regression to be expensive, and unlike a component's own stylesheet marker its
// absence is not implied by the checks above: the import could survive a barrel that drops those
// components' own code.
// These markers are runtime strings floating-ui emits, not names a bundler can rename away.
const floatingUiMarkers = ["data-floating-ui", "computePosition"];
for (const marker of floatingUiMarkers) {
  assert.ok(!code.includes(marker), `@floating-ui/react leaked into a bundle that only imported Button (found "${marker}")`);
}

// `@vipengele/react-telemetry` is a peer, reachable from the package's entry through Dropdown's
// `loadOptions`. It is externalised above, so it leaks not as inlined code but as an import of the
// package, which a Button-only bundle has no use for. The marker is that import's specifier, a
// string no bundler renames.
const telemetryMarker = "@vipengele/react-telemetry";
assert.ok(!code.includes(telemetryMarker), `${telemetryMarker} leaked into a bundle that only imported Button`);

// `@tanstack/virtual-core` is a real runtime dependency, reached through Tree's
// `@tanstack/react-virtual` import. The marker is the text of the warning its `Virtualizer`
// constructor builds unconditionally for an unindexed measured element: a string literal, so no
// bundler renames it, and part of the class itself, so it is present whenever virtual-core is.
const virtualCoreMarker = "on measured element.";
assert.ok(
  !code.includes(virtualCoreMarker),
  `@tanstack/virtual-core leaked into a bundle that only imported Button (found "${virtualCoreMarker}")`,
);

// The positive control for the Tree and virtual-core absence checks above: a bundle that imports
// Tree carries both markers, so their absence from the Button bundle is a tree-shaking result
// rather than a marker that never appears in any bundle.
const treeCode = await bundle("entry-tree.js");
assert.ok(treeCode.includes(".vpg-tree {"), "the requested component (Tree) is missing from the Tree bundle");
assert.ok(
  treeCode.includes(virtualCoreMarker),
  `@tanstack/virtual-core is missing from the Tree bundle (no "${virtualCoreMarker}"), though Tree virtualises its rows with it`,
);

console.log(
  `bundle-check passed (${code.length} bytes): only Button and Spinner were bundled, with no @floating-ui/react, @tanstack/virtual-core or @vipengele/react-telemetry; the Tree bundle (${treeCode.length} bytes) carries Tree and @tanstack/virtual-core.`,
);
