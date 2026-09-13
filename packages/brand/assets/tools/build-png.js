#!/usr/bin/env node
// biome-ignore-all lint/correctness/noNodejsModules: node build tooling, run by hand and by the build — it never ships to a browser, which is the rule's concern.
// biome-ignore-all lint/correctness/noProcessGlobal: same — this is a CLI script; argv and exit codes are how it talks to its caller.
/**
 * build-png.js
 *
 * Render an SVG to a PNG at a given pixel width.
 *
 * Usage:
 *   node build-png.js <input.svg> <width> [output.png]
 *
 * Examples:
 *   node build-png.js ../dist/tandiko-logo.svg 512
 *   node build-png.js ../dist/tandiko-mark.svg 192 mark-192.png
 *
 * If no output path is given, the PNG is written next to the SVG with
 * a "-<width>" suffix, e.g. tandiko-logo-512.png.
 *
 * Always use the outlined files from dist/ as input — src/ files rely on
 * installed fonts and may render incorrectly on the build machine.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let Resvg;
try {
  ({ Resvg } = await import('@resvg/resvg-js'));
} catch {
  console.error('\n  Missing dep — run: yarn install\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const [,, inputArg, widthArg, outputArg] = process.argv;

if (!inputArg || !widthArg) {
  console.error('\n  Usage: node build-png.js <input.svg> <width> [output.png]\n');
  process.exit(1);
}

const width = parseInt(widthArg, 10);
if (isNaN(width) || width <= 0) {
  console.error(`\n  Invalid width: "${widthArg}" — must be a positive integer\n`);
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
if (!fs.existsSync(inputPath)) {
  console.error(`\n  File not found: ${inputPath}\n`);
  process.exit(1);
}

const stem = path.basename(inputPath, '.svg');
const defaultOut = path.join(path.dirname(inputPath), `${stem}-${width}.png`);
const outputPath = outputArg ? path.resolve(process.cwd(), outputArg) : defaultOut;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const svg = fs.readFileSync(inputPath);
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: width },
});

const rendered = resvg.render();
fs.writeFileSync(outputPath, rendered.asPng());

const relOut = path.relative(process.cwd(), outputPath);
console.log(`  ✓ ${relOut}  (${rendered.width}×${rendered.height})`);
