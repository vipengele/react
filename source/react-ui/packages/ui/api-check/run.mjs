// Proves the package's public types hide the third-party engines it is built on: no declaration
// file a consumer's type checker can reach from `dist/index.d.ts` names a `@tanstack/` package.
// A consumer who could type against an engine's types would come to depend on them, and the
// engine's next major version would then be this package's breaking change
// (`docs/adr/0046-datatable-takes-tanstack-table-as-its-behaviour-engine.md`). tsc also emits
// declarations for internal modules that nothing public re-exports; those are not part of the
// surface, so only the files reachable from the entry are scanned.
// The runtime export list is not pinned to an exact set, as the charts package's `api-check` pins
// its own: this package exports dozens of components and types, so an exact list would change with
// every component and guard nothing the forbidden-specifier scan does not. What is pinned instead
// is that every component's declaration file is reachable, so the scan cannot pass by walking
// past a component.
// This is a standalone Node script (`node api-check/run.mjs`), never bundled into the
// package's published dist/ — the noNodejsModules rule exists to keep Node built-ins out of
// code that ships to consumers, which this deliberately is not.
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import assert from "node:assert/strict";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import { existsSync, readdirSync, readFileSync } from "node:fs";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import path from "node:path";
// biome-ignore lint/correctness/noNodejsModules: standalone Node script, not published
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../dist");

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

// Every component keeps its declarations in `dist/<Name>/<Name>.d.ts`, and every one of them is
// public. One that is not reachable from the entry would go unscanned for the forbidden specifiers
// below. `dist/internal/` holds shared modules, not components, and is reached only through them.
const componentDeclarations = readdirSync(dist, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "internal")
  .map((entry) => path.join(dist, entry.name, `${entry.name}.d.ts`))
  .filter((declaration) => existsSync(declaration));
assert.ok(componentDeclarations.length > 0, "dist/ holds no dist/<Name>/<Name>.d.ts, so this check scans no component");
for (const declaration of componentDeclarations) {
  const relative = path.relative(dist, declaration);
  assert.ok(reachable.has(declaration), `dist/${relative} is not reachable from dist/index.d.ts, so its public types go unscanned`);
}

// Any `@tanstack/` specifier, not only the table engine's: Tree's `@tanstack/react-virtual` is held
// to the same rule as DataTable's `@tanstack/react-table` and its transitives.
const forbiddenSpecifier = /["']@tanstack\/[^"']*["']/;
for (const file of reachable) {
  const lines = readFileSync(file, "utf8").split("\n");
  const offending = lines.flatMap((line, index) => (forbiddenSpecifier.test(line) ? [`  ${index + 1}: ${line.trim()}`] : []));
  assert.equal(
    offending.length,
    0,
    `dist/${path.relative(dist, file)} is part of the public type surface and names a @tanstack/ package:\n${offending.join("\n")}`,
  );
}

console.log(
  `api-check passed: the ${reachable.size} declaration files reachable from dist/index.d.ts, including all ${componentDeclarations.length} component declarations, name no @tanstack/ package.`,
);
