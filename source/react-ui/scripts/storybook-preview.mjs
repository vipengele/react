#!/usr/bin/env node
// Stages the static Storybook build as a self-contained, publishable preview.
//
//   node scripts/storybook-preview.mjs [outDir]
//
// Builds every workspace package in dependency order (pnpm, not turbo), builds Storybook,
// copies `storybook-static/` to `<outDir>/sb/`, writes `<outDir>/preview.html` (a page that
// frames it) and `<outDir>/files.json` (the `files` list for the Artifact tool).
//
// The Artifact publisher refuses text files containing a literal U+FFFD, and bundled
// parsers carry one in string literals. It is rewritten to the `\uFFFD` escape, which
// evaluates to the same character in JS, CSS and JSON strings. HTML, SVG and other text
// with a literal one cannot be rewritten safely and abort the run.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.argv[2] ?? join(tmpdir(), "vpg-storybook-preview");
const staticDir = join(projectRoot, "apps/storybook/storybook-static");
const sbDir = join(outDir, "sb");

const ESCAPABLE = /\.(?:js|mjs|css|json)$/;
const BINARY = /\.(?:woff2?|ttf|otf|png|jpe?g|gif|webp|ico)$/;

const launcher = `<title>Storybook Preview</title>
<style>
:root{--bg:#f6f7f9;--fg:#1a1d23;--bar:#e6e9ef}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#14161a;--fg:#e8eaee;--bar:#23262d;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#14161a;--fg:#e8eaee;--bar:#23262d;color-scheme:dark}
html,body{height:100%}
body{background:var(--bg);color:var(--fg);display:flex;flex-direction:column;font-family:system-ui,sans-serif}
header{background:var(--bar);padding:8px 16px;font-size:13px}
a{color:inherit}
iframe{flex:1;border:0;width:100%;background:#fff}
</style>
<header>Storybook static build · <a href="sb/index.html" target="_blank">open standalone</a></header>
<iframe id="sb" src="sb/index.html" title="Storybook"></iframe>
`;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

execFileSync("pnpm", ["-r", "--workspace-concurrency=1", "build"], {
  cwd: projectRoot,
  stdio: "inherit",
});

rmSync(outDir, { recursive: true, force: true });
mkdirSync(sbDir, { recursive: true });

const files = [];
for (const src of walk(staticDir).sort()) {
  const rel = relative(staticDir, src);
  const dest = join(sbDir, rel);
  mkdirSync(dirname(dest), { recursive: true });

  if (BINARY.test(rel)) {
    copyFileSync(src, dest);
  } else {
    const text = readFileSync(src, "utf8");
    if (text.includes("\uFFFD")) {
      if (!ESCAPABLE.test(rel)) {
        throw new Error(`${rel} contains a literal U+FFFD that cannot be escaped`);
      }
      writeFileSync(dest, text.replaceAll("\uFFFD", "\\uFFFD"));
    } else {
      copyFileSync(src, dest);
    }
  }
  files.push({ path: `sb/${rel}` });
}

writeFileSync(join(outDir, "preview.html"), launcher);
writeFileSync(join(outDir, "files.json"), JSON.stringify(files));

console.log(`\nstaged ${files.length} files in ${outDir}`);
console.log(`  page:  ${join(outDir, "preview.html")}`);
console.log(`  files: ${join(outDir, "files.json")}`);
