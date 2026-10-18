import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { budgetProblems, checkReasons, countPragmas, reasonProblems } from "./coverage-ignores.mjs";

describe("checkReasons", () => {
  it("accepts next and start/stop pragmas that carry a reason", () => {
    const text = [
      "/* v8 ignore next -- engine fallback no test can reach */",
      "throw new Error('unreachable');",
      "/* v8 ignore start -- guard for a state the types forbid */",
      "a();",
      "/* v8 ignore stop */",
    ].join("\n");
    assert.deepEqual(checkReasons(text), []);
  });

  it("accepts a pragma on an if statement's body line", () => {
    assert.deepEqual(checkReasons("/* v8 ignore next -- impossible */\nif (x) {\n  y();\n}\n"), []);
  });

  it("rejects a pragma without a reason", () => {
    assert.equal(checkReasons("/* v8 ignore next */\nx();").length, 1);
    assert.equal(checkReasons("/* v8 ignore next -- */\nx();").length, 1);
    assert.equal(checkReasons("/* v8 ignore start */\nx();\n/* v8 ignore stop */").length, 1);
  });

  it("rejects file-level and branch-hiding forms", () => {
    for (const kind of ["file", "if", "else", "try", "catch"]) {
      assert.equal(checkReasons(`/* v8 ignore ${kind} -- why */\nx();`).length, 1, kind);
    }
  });

  it("rejects a line count on next", () => {
    assert.equal(checkReasons("/* v8 ignore next 3 -- why */\nx();").length, 1);
  });

  it("rejects the same pragmas under the c8 and istanbul names", () => {
    assert.equal(checkReasons("/* c8 ignore next */\nx();").length, 1);
    assert.equal(checkReasons("/* istanbul ignore file */\nx();").length, 1);
  });

  it("rejects a pragma on a whole function", () => {
    assert.equal(checkReasons("/* v8 ignore next -- why */\nexport function f() {\n  return 1;\n}").length, 1);
    assert.equal(checkReasons("/* v8 ignore next -- why */\nconst f = () => {\n  return 1;\n};").length, 1);
    assert.equal(checkReasons("class A {\n  /* v8 ignore next -- why */\n  run() {\n    x();\n  }\n}").length, 1);
  });

  it("rejects an unbalanced start/stop pair", () => {
    assert.equal(checkReasons("/* v8 ignore stop */").length, 1);
    assert.equal(checkReasons("/* v8 ignore start -- why */\nx();").length, 1);
    assert.equal(
      checkReasons("/* v8 ignore start -- a */\n/* v8 ignore start -- b */\n/* v8 ignore stop */").length,
      1,
    );
  });
});

describe("countPragmas", () => {
  it("counts next and start, never stop", () => {
    const text = "/* v8 ignore next -- a */\nx();\n/* v8 ignore start -- b */\ny();\n/* v8 ignore stop */";
    assert.equal(countPragmas(text), 2);
  });
});

describe("project checks", () => {
  const dir = mkdtempSync(join(tmpdir(), "coverage-ignores-"));
  after(() => rmSync(dir, { recursive: true, force: true }));

  const write = (path, text) => {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  write("packages/a/src/index.ts", "/* v8 ignore next -- why */\nx();\n");
  write("packages/a/src/index.test.ts", "/* v8 ignore next */\nx();\n");
  write("packages/b/src/index.ts", "x();\n");

  it("skips test files and names the file and line of a problem", () => {
    assert.deepEqual(reasonProblems(dir), []);
    write("packages/b/src/bad.ts", "x();\n/* v8 ignore file */\n");
    assert.match(reasonProblems(dir)[0], /^packages\/b\/src\/bad\.ts:2: /);
    rmSync(join(dir, "packages/b/src/bad.ts"));
  });

  it("fails a package over budget, a package with no entry and a missing budget file", () => {
    assert.match(budgetProblems(dir).problems[0], /does not exist/);
    write("coverage-ignore-budget.json", JSON.stringify({ a: 0, b: 0 }));
    const over = budgetProblems(dir).problems;
    assert.equal(over.length, 1);
    assert.match(over[0], /packages\/a has 1 .* budget is 0/);
    write("coverage-ignore-budget.json", JSON.stringify({ a: 1 }));
    assert.match(budgetProblems(dir).problems[0], /packages\/b has no/);
  });

  it("passes a package within budget and reports slack", () => {
    write("coverage-ignore-budget.json", JSON.stringify({ a: 2, b: 0 }));
    const { problems, slack } = budgetProblems(dir);
    assert.deepEqual(problems, []);
    assert.equal(slack.length, 1);
  });
});
