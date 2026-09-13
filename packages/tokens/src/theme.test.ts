import { describe, expect, it } from "vitest";
import { baseStylesheet } from "./base-stylesheet.js";
import { createTheme, type Theme } from "./theme.js";

const EXPECTED_KEYS = [
  "--tandiko-seed-accent",
  "--tandiko-seed-ink",
  "--tandiko-seed-surface",
  "--tandiko-accent",
  "--tandiko-ink",
  "--tandiko-surface",
  "--tandiko-accent-dark",
  "--tandiko-ink-dark",
  "--tandiko-surface-dark",
  "--tandiko-state-shift",
  "--tandiko-lift",
  "--tandiko-sink",
  "--tandiko-accent-hover",
  "--tandiko-accent-press",
  "--tandiko-accent-wash",
  "--tandiko-accent-ring",
  "--tandiko-accent-contrast",
  "--tandiko-ink-muted",
  "--tandiko-ink-subtle",
  "--tandiko-border",
  "--tandiko-border-strong",
  "--tandiko-surface-raised",
  "--tandiko-surface-sunken",
  "--tandiko-surface-hover",
  "--tandiko-surface-press",
  "--tandiko-radius",
  "--tandiko-radius-sm",
  "--tandiko-radius-lg",
  "--tandiko-radius-full",
  "--tandiko-font-sans",
  "--tandiko-font-mono",
] as const;

describe("createTheme", () => {
  it("expands an empty seed into the full default property set", () => {
    const theme = createTheme();

    expect(Object.keys(theme).sort()).toEqual([...EXPECTED_KEYS].sort());
    for (const key of EXPECTED_KEYS) {
      expect(theme[key], key).toBeTypeOf("string");
      expect(theme[key], key).not.toBe("");
    }
  });

  it("names every property under the --tandiko- prefix", () => {
    for (const key of Object.keys(createTheme())) {
      expect(key.startsWith("--tandiko-")).toBe(true);
    }
  });

  it("leaves the other seeds at their defaults when one is overridden", () => {
    const defaults = createTheme();
    const custom = createTheme({ accent: "oklch(0.7 0.2 30)" });

    expect(custom["--tandiko-seed-accent"]).toBe("oklch(0.7 0.2 30)");
    // Every other entry is a CSS expression reading the seed back through `var()`, so an
    // accent override changes exactly one entry and the ramp re-derives in the browser.
    expect(differingKeys(defaults, custom)).toEqual(["--tandiko-seed-accent"]);
  });

  it("applies each seed field independently", () => {
    const theme = createTheme({
      accent: "oklch(0.5 0.1 120)",
      ink: "oklch(0.1 0 0)",
      surface: "oklch(1 0 0)",
      radius: "2px",
      fontSans: "Inter",
      fontMono: "Fira Code",
    });

    expect(theme["--tandiko-seed-accent"]).toBe("oklch(0.5 0.1 120)");
    expect(theme["--tandiko-seed-ink"]).toBe("oklch(0.1 0 0)");
    expect(theme["--tandiko-seed-surface"]).toBe("oklch(1 0 0)");
    expect(theme["--tandiko-radius"]).toBe("2px");
    expect(theme["--tandiko-font-sans"]).toBe("Inter");
    expect(theme["--tandiko-font-mono"]).toBe("Fira Code");
  });

  it("derives the dependent-state ramps as oklch relative colours, not JS-computed values", () => {
    const theme = createTheme();

    expect(theme["--tandiko-accent-hover"]).toContain(
      "oklch(from var(--tandiko-accent)",
    );
    expect(theme["--tandiko-accent-press"]).toContain(
      "oklch(from var(--tandiko-accent)",
    );
    expect(theme["--tandiko-accent-wash"]).toContain(
      "oklch(from var(--tandiko-accent)",
    );
    expect(theme["--tandiko-surface-hover"]).toContain(
      "oklch(from var(--tandiko-surface)",
    );
    expect(theme["--tandiko-ink-muted"]).toContain(
      "oklch(from var(--tandiko-ink)",
    );
  });

  it("derives the dark variants from the seed echoes, so no property depends on itself", () => {
    const theme = createTheme();

    expect(theme["--tandiko-accent-dark"]).toContain(
      "var(--tandiko-seed-accent)",
    );
    expect(theme["--tandiko-ink-dark"]).toContain("var(--tandiko-seed-ink)");
    expect(theme["--tandiko-surface-dark"]).toContain(
      "var(--tandiko-seed-surface)",
    );
    for (const seedKey of [
      "--tandiko-seed-accent",
      "--tandiko-seed-ink",
      "--tandiko-seed-surface",
    ] as const) {
      expect(theme[seedKey]).not.toContain("var(");
    }
  });

  it("freezes the result", () => {
    const theme = createTheme();

    expect(Object.isFrozen(theme)).toBe(true);
    expect(() => {
      (theme as Record<string, string>)["--tandiko-accent"] = "red";
    }).toThrow(TypeError);
    expect(theme["--tandiko-accent"]).toBe("var(--tandiko-seed-accent)");
  });

  it("round-trips through JSON as a flat object of string keys and values", () => {
    const theme = createTheme({ accent: "oklch(0.7 0.2 30)" });
    const roundTripped: unknown = JSON.parse(JSON.stringify(theme));

    expect(roundTripped).toEqual({ ...theme });
    for (const value of Object.values(
      roundTripped as Record<string, unknown>,
    )) {
      expect(value).toBeTypeOf("string");
    }
  });
});

describe("baseStylesheet", () => {
  it("carries the host-inheritance rule that an explicit colorMode overrides", () => {
    expect(baseStylesheet).toContain(
      ':root[data-theme="dark"] .tandiko-root:not([data-tandiko-mode="light"])',
    );
  });

  it("drives the same dark overrides from a prefers-color-scheme query", () => {
    expect(baseStylesheet).toContain("@media (prefers-color-scheme: dark)");
    expect(baseStylesheet).toContain('.tandiko-root[data-tandiko-mode="dark"]');
    // One block per selector: explicit mode, host attribute, OS preference.
    expect(
      baseStylesheet.match(
        /--tandiko-surface: var\(--tandiko-surface-dark\);/g,
      ),
    ).toHaveLength(3);
  });
});

function differingKeys(a: Theme, b: Theme): string[] {
  const keys = new Set([
    ...Object.keys(a),
    ...Object.keys(b),
  ]) as Set<`--tandiko-${string}`>;
  return [...keys].filter((key) => a[key] !== b[key]);
}
