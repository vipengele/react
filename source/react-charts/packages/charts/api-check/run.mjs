// Proves the package's public surface hides the charting library it is built on: the built
// `dist/index.js` exports exactly the intended runtime names, and no declaration file a consumer's
// type checker can reach from `dist/index.d.ts` names Recharts or the internal
// `ThemedChartContainer`. A consumer who could import or type against either would come to depend
// on it, and swapping the library underneath would then be a breaking change. tsc also emits
// declarations for internal modules that nothing public re-exports; those are not part of the
// surface, so only the files reachable from the entry are scanned.
// This is a standalone Node script (`node api-check/run.mjs`), never bundled into the
// package's published dist/ — the noNodejsModules rule exists to keep Node built-ins out of
// code that ships to consumers, which this deliberately is not.
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import assert from "node:assert/strict";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import { existsSync, readFileSync } from "node:fs";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import path from "node:path";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../dist");

// The runtime names a consumer may import. Adding or removing a public export means changing this
// list in the same change, so the surface never moves by accident.
const expectedExports = ["AreaChart", "LineChart"];

const actualExports = Object.keys(await import(pathToFileURL(path.join(dist, "index.js")).href)).sort();
assert.deepEqual(
  actualExports,
  [...expectedExports].sort(),
  `dist/index.js exports ${JSON.stringify(actualExports)}, not the intended public set ${JSON.stringify(expectedExports)}`,
);

// Resolves a relative module specifier in a declaration file to the `.d.ts` it names: tsc keeps the
// source's `./x.js` specifiers, which a type checker maps to `./x.d.ts` (or `./x/index.d.ts`).
function resolveDeclaration(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const stem = base.replace(/\.(js|mjs|cjs|jsx|ts|tsx)$/, "");
  const candidates = [`${stem}.d.ts`, path.join(base, "index.d.ts")];
  const found = candidates.find((candidate) => existsSync(candidate));
  assert.ok(found, `${path.relative(dist, fromFile)} references "${specifier}", which resolves to no declaration file`);
  return found;
}

// Every `from "..."`, `import("...")` and side-effect `import "..."` specifier in a declaration file.
const specifierPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

const reachable = new Set();
const pending = [path.join(dist, "index.d.ts")];
while (pending.length > 0) {
  const file = pending.pop();
  if (reachable.has(file)) {
    continue;
  }
  reachable.add(file);
  for (const [, specifier] of readFileSync(file, "utf8").matchAll(specifierPattern)) {
    if (specifier.startsWith(".")) {
      pending.push(resolveDeclaration(file, specifier));
    }
  }
}

const lineChartDeclaration = path.join(dist, "LineChart", "LineChart.d.ts");
assert.ok(reachable.size > 0, "no declaration file is reachable from dist/index.d.ts, so this check scans nothing");
assert.ok(
  reachable.has(lineChartDeclaration),
  "dist/LineChart/LineChart.d.ts is not reachable from dist/index.d.ts, so LineChart's public types go unscanned",
);

const forbidden = [
  { name: "Recharts", pattern: /recharts/i },
  { name: "ThemedChartContainer", pattern: /ThemedChartContainer/ },
];
const relativeReachable = [...reachable].map((file) => path.relative(dist, file)).sort();
for (const file of reachable) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (const { name, pattern } of forbidden) {
    const offending = lines.flatMap((line, index) => (pattern.test(line) ? [`  ${index + 1}: ${line.trim()}`] : []));
    assert.equal(
      offending.length,
      0,
      `dist/${path.relative(dist, file)} is part of the public type surface and names ${name}:\n${offending.join("\n")}`,
    );
  }
}

console.log(
  `api-check passed: dist/index.js exports exactly ${JSON.stringify(expectedExports)}, and the ${reachable.size} declaration files reachable from dist/index.d.ts (${relativeReachable.join(", ")}) name neither Recharts nor ThemedChartContainer.`,
);
