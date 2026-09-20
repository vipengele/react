/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";

/**
 * A component reads a `--vpg-*` custom property bare — `var(--vpg-space-2)` — and never
 * with a literal fallback. The token substrate in `@vipengele/react-tokens` is the single source of that
 * value; a fallback duplicates it as a second, driftable copy that silently wins whenever the
 * substrate is missing the property, which is exactly the bug a fallback exists to hide rather
 * than surface. If a token the substrate doesn't define yet is needed, the fix is to add it there
 * — not to inline a guess here.
 *
 * `import.meta.glob` walks the real `src/` tree at test-run time rather than a fixed file list,
 * so a fallback introduced tomorrow in a component that doesn't exist yet is still caught. The
 * glob excludes this file itself, so the pattern this test asserts is absent everywhere else
 * can't match its own description of that pattern.
 */
const sourceFiles = import.meta.glob(["./**/*.{ts,tsx}", "!./no-fallback-var-reads.test.ts"], {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

// Assembled from parts rather than written as one literal, so a future refactor that inlines
// this test's own path filter above can't accidentally make the string match its own source.
const fallbackPattern = new RegExp(["var\\(--vpg-[a-z0-9-]+", ","].join(""));

describe("var(--vpg-*) reads", () => {
  it("never carry a literal fallback value", () => {
    const offenses: string[] = [];

    for (const [path, contents] of Object.entries(sourceFiles)) {
      contents.split("\n").forEach((line, index) => {
        if (!fallbackPattern.test(line)) return;
        offenses.push(`${path}:${index + 1}: ${line.trim()}`);
      });
    }

    expect(
      offenses,
      offenses.length > 0
        ? `Found ${offenses.length} var(--vpg-*) read(s) with a literal fallback. Read the ` +
            "token bare instead — var(--vpg-name), not var(--vpg-name, <literal>). If " +
            "the token doesn't exist yet, add it to @vipengele/react-tokens rather than inlining a " +
            `guess here:\n${offenses.join("\n")}`
        : undefined,
    ).toHaveLength(0);
  });
});
