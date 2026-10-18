#!/usr/bin/env node
// Checks the coverage-ignore pragmas in a project's package sources (ADR-0047, ADR-0048).
//
//   node ../../scripts/coverage-ignores.mjs reasons   # run by `pnpm lint`
//   node ../../scripts/coverage-ignores.mjs budget    # run by ci-build.yml
//
// Run from `source/<project>`. Both modes scan `packages/*/src`, skipping test files.
//
// `reasons` fails on a pragma that is not `/* v8 ignore next -- <reason> */` or a
// `start -- <reason>` / `stop` pair: a missing reason, a `file`, `if`, `else`, `try` or
// `catch` form, a `next <n>` line count, an unbalanced pair, or a pragma on a function.
// `c8 ignore` and `istanbul ignore` are held to the same rules, so renaming the pragma
// does not get around them.
//
// `budget` fails when a package holds more pragmas than `coverage-ignore-budget.json`
// allows, or has no entry there. A `next` and a `start` each count as one; a `stop` does not.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const PRAGMA = /\/\*\s*(?:v8|c8|istanbul)\s+ignore\b([^*]*(?:\*(?!\/)[^*]*)*)\*\//g;
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE = /\.(?:test|spec|stories)\.[cm]?[jt]sx?$|\.d\.ts$/;
const SKIPPED_DIRS = new Set(["node_modules", "dist", "coverage", "__tests__"]);
const FUNCTION_OPENER =
  /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\b|=>\s*\{?\s*$|^\s*(?:(?:public|private|protected|static|async|get|set)\s+)*[#\w$]+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*$/;
const CONTROL_FLOW = /^\s*(?:\}\s*)?(?:if|else|for|while|switch|catch|try|do)\b/;

function sourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...sourceFiles(join(dir, entry.name)));
    } else if (SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

/** The pragmas in one file's text: `{ line, kind, reason, followingLine }`. */
export function findPragmas(text) {
  const lines = text.split("\n");
  const pragmas = [];
  for (const match of text.matchAll(PRAGMA)) {
    const line = text.slice(0, match.index).split("\n").length;
    const body = match[1].trim();
    const [head, ...rest] = body.split(/\s+--\s+|\s+--$/);
    const words = head.trim().split(/\s+/).filter(Boolean);
    const endLine = line + match[0].split("\n").length - 1;
    pragmas.push({
      line,
      kind: words[0] ?? "",
      extra: words.slice(1),
      reason: rest.join(" -- ").trim(),
      followingLine: lines.slice(endLine).find((l) => l.trim() !== "") ?? "",
    });
  }
  return pragmas;
}

/** The problems with one file's pragmas, as `line: message` strings. */
export function checkReasons(text) {
  const problems = [];
  let open = null;
  for (const p of findPragmas(text)) {
    const at = `${p.line}`;
    if (p.kind === "stop") {
      if (open === null) problems.push(`${at}: \`ignore stop\` has no matching \`ignore start\``);
      open = null;
      continue;
    }
    if (p.kind !== "next" && p.kind !== "start") {
      problems.push(
        `${at}: \`ignore ${p.kind}\` is not allowed; only \`next\` and \`start\`/\`stop\` are, with a reason`,
      );
      continue;
    }
    if (p.extra.length > 0) {
      problems.push(`${at}: \`ignore ${p.kind} ${p.extra.join(" ")}\` takes no argument before \`--\``);
    }
    if (p.reason === "") {
      problems.push(`${at}: \`ignore ${p.kind}\` has no reason; write \`ignore ${p.kind} -- <why no test can reach it>\``);
    }
    if (FUNCTION_OPENER.test(p.followingLine) && !CONTROL_FLOW.test(p.followingLine)) {
      problems.push(`${at}: \`ignore ${p.kind}\` sits on a function; ignore the unreachable lines inside it`);
    }
    if (p.kind === "start") {
      if (open !== null) problems.push(`${at}: \`ignore start\` opens inside the one from line ${open}`);
      open = p.line;
    }
  }
  if (open !== null) problems.push(`${open}: \`ignore start\` is never closed by an \`ignore stop\``);
  return problems;
}

/** How many pragmas count against a package's budget in one file's text. */
export function countPragmas(text) {
  return findPragmas(text).filter((p) => p.kind === "next" || p.kind === "start").length;
}

function packageSources(projectDir) {
  const packagesDir = join(projectDir, "packages");
  if (!existsSync(packagesDir)) return [];
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(packagesDir, d.name, "src")))
    .map((d) => ({ name: d.name, files: sourceFiles(join(packagesDir, d.name, "src")) }));
}

/** Pragma problems across a project, as `path:line: message` strings. */
export function reasonProblems(projectDir) {
  return packageSources(projectDir).flatMap(({ files }) =>
    files.flatMap((file) =>
      checkReasons(readFileSync(file, "utf8")).map((p) => `${relative(projectDir, file)}:${p}`),
    ),
  );
}

/** Budget problems across a project, as messages; an under-budget package is returned in `slack`. */
export function budgetProblems(projectDir) {
  const budgetFile = join(projectDir, "coverage-ignore-budget.json");
  if (!existsSync(budgetFile)) return { problems: [`${budgetFile} does not exist`], slack: [] };
  const budget = JSON.parse(readFileSync(budgetFile, "utf8"));
  const problems = [];
  const slack = [];
  for (const { name, files } of packageSources(projectDir)) {
    const allowed = budget[name];
    if (!Number.isInteger(allowed) || allowed < 0) {
      problems.push(`packages/${name} has no non-negative integer entry in coverage-ignore-budget.json`);
      continue;
    }
    const used = files.reduce((sum, file) => sum + countPragmas(readFileSync(file, "utf8")), 0);
    if (used > allowed) {
      problems.push(
        `packages/${name} has ${used} coverage ignore pragma(s), budget is ${allowed}; ` +
          "raise it in coverage-ignore-budget.json in the same change, or remove the pragma",
      );
    } else if (used < allowed) {
      slack.push(`packages/${name} uses ${used} of ${allowed}; lower its budget to ${used}`);
    }
  }
  return { problems, slack };
}

function main(mode, projectDir) {
  if (mode === "reasons") {
    const problems = reasonProblems(projectDir);
    for (const p of problems) console.error(p);
    return problems.length === 0 ? 0 : 1;
  }
  if (mode === "budget") {
    const { problems, slack } = budgetProblems(projectDir);
    for (const s of slack) console.warn(`note: ${s}`);
    for (const p of problems) console.error(p);
    return problems.length === 0 ? 0 : 1;
  }
  console.error("usage: coverage-ignores.mjs <reasons|budget>");
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv[2], process.cwd()));
}
