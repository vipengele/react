import { describe, expect, it } from "vitest";
import { baseStylesheet } from "./base-stylesheet.js";
import {
  createTheme,
  STYLESHEET_OWNED_PROPERTIES,
  type Theme,
  type ThemeOverrides,
} from "./theme.js";

const EXPECTED_KEYS = [
  "--tandiko-accent-light",
  "--tandiko-ink-light",
  "--tandiko-surface-light",
  "--tandiko-accent-dark",
  "--tandiko-ink-dark",
  "--tandiko-surface-dark",
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
  "--tandiko-size-xs",
  "--tandiko-size-sm",
  "--tandiko-size-md",
  "--tandiko-size-lg",
  "--tandiko-size-xl",
  "--tandiko-icon-sm",
  "--tandiko-icon-md",
  "--tandiko-icon-lg",
  "--tandiko-space-1",
  "--tandiko-space-2",
  "--tandiko-space-3",
  "--tandiko-space-4",
  "--tandiko-space-5",
  "--tandiko-space-6",
  "--tandiko-space-7",
  "--tandiko-space-8",
  "--tandiko-font-size-xs",
  "--tandiko-font-size-sm",
  "--tandiko-font-size-md",
  "--tandiko-font-size-lg",
  "--tandiko-font-size-xl",
  "--tandiko-font-size-2xl",
  "--tandiko-font-size-3xl",
  "--tandiko-font-size-4xl",
  "--tandiko-font-weight-regular",
  "--tandiko-font-weight-medium",
  "--tandiko-font-weight-semibold",
  "--tandiko-font-weight-bold",
  "--tandiko-line-height-tight",
  "--tandiko-line-height-snug",
  "--tandiko-line-height-normal",
  "--tandiko-line-height-relaxed",
  "--tandiko-letter-spacing-tight",
  "--tandiko-letter-spacing-normal",
  "--tandiko-letter-spacing-wide",
  "--tandiko-ease-standard",
  "--tandiko-ease-entrance",
  "--tandiko-ease-exit",
  "--tandiko-shadow-low",
  "--tandiko-shadow-med",
  "--tandiko-shadow-high",
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

  it("never sets --tandiko-accent/-ink/-surface inline, so the dark-mode stylesheet rule can override them", () => {
    // An inline style declaration always wins over a stylesheet selector for the same
    // property on the same element, no matter how specific that selector is. If these
    // three were part of the object ThemeProvider applies inline, no CSS rule — including
    // baseStylesheet's own dark-mode overrides — could ever change them.
    const theme = createTheme();

    expect(theme).not.toHaveProperty("--tandiko-accent");
    expect(theme).not.toHaveProperty("--tandiko-ink");
    expect(theme).not.toHaveProperty("--tandiko-surface");
  });

  it("leaves the other seeds at their defaults when one is overridden", () => {
    const defaults = createTheme();
    const custom = createTheme({ accent: "oklch(0.7 0.2 30)" });

    expect(custom["--tandiko-accent-light"]).toBe("oklch(0.7 0.2 30)");
    // Every other entry is a CSS expression reading the seed back through `var()`, so an
    // accent override changes exactly one entry and the ramp re-derives in the browser.
    expect(differingKeys(defaults, custom)).toEqual(["--tandiko-accent-light"]);
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

    expect(theme["--tandiko-accent-light"]).toBe("oklch(0.5 0.1 120)");
    expect(theme["--tandiko-ink-light"]).toBe("oklch(0.1 0 0)");
    expect(theme["--tandiko-surface-light"]).toBe("oklch(1 0 0)");
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

  it("derives the dark variants from the light variants, so no property depends on itself", () => {
    const theme = createTheme();

    expect(theme["--tandiko-accent-dark"]).toContain(
      "var(--tandiko-accent-light)",
    );
    expect(theme["--tandiko-ink-dark"]).toContain("var(--tandiko-ink-light)");
    expect(theme["--tandiko-surface-dark"]).toContain(
      "var(--tandiko-surface-light)",
    );
    for (const lightKey of [
      "--tandiko-accent-light",
      "--tandiko-ink-light",
      "--tandiko-surface-light",
    ] as const) {
      expect(theme[lightKey]).not.toContain("var(");
    }
  });

  it("freezes the result", () => {
    const theme = createTheme();

    expect(Object.isFrozen(theme)).toBe(true);
    expect(() => {
      (theme as Record<string, string>)["--tandiko-accent-light"] = "red";
    }).toThrow(TypeError);
    expect(theme["--tandiko-accent-light"]).toBe("oklch(0.58 0.19 264)");
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

/**
 * Builds overrides through a wider type. Naming a stylesheet-owned property in an object literal
 * typed as `ThemeOverrides` is a compile error, which is the first line of the guard; these
 * tests exercise the second, for the value that reaches `createTheme` from untyped data.
 */
function widened(entries: Record<string, string>): ThemeOverrides {
  return entries as ThemeOverrides;
}

describe("createTheme overrides", () => {
  it("replaces a derived value with the one the consumer supplied", () => {
    const theme = createTheme({ radius: "2px" }, { "--tandiko-radius": "9px" });

    expect(theme["--tandiko-radius"]).toBe("9px");
  });

  it("changes nothing but the properties it names", () => {
    const seeded = createTheme({ accent: "oklch(0.7 0.2 30)" });
    const overridden = createTheme(
      { accent: "oklch(0.7 0.2 30)" },
      { "--tandiko-space-4": "1.25rem", "--tandiko-radius-full": "999px" },
    );

    expect(differingKeys(seeded, overridden).sort()).toEqual([
      "--tandiko-radius-full",
      "--tandiko-space-4",
    ]);
  });

  it("carries a --tandiko-* property createTheme does not emit", () => {
    const theme = createTheme({}, { "--tandiko-brand-glow": "0 0 12px red" });

    expect(theme["--tandiko-brand-glow"]).toBe("0 0 12px red");
  });

  it("produces the same theme as the seed alone when no override is given", () => {
    expect({ ...createTheme({ ink: "oklch(0.1 0 0)" }, {}) }).toEqual({
      ...createTheme({ ink: "oklch(0.1 0 0)" }),
    });
  });

  it("freezes the composed result", () => {
    const theme = createTheme({}, { "--tandiko-radius": "9px" });

    expect(Object.isFrozen(theme)).toBe(true);
  });

  it.each(STYLESHEET_OWNED_PROPERTIES)(
    "throws rather than shadowing the base stylesheet's %s",
    (property) => {
      // An override lands inline on `.tandiko-root`, the very element the mode and
      // reduced-motion rules match, so a stylesheet-owned property accepted here would pin that
      // property to one colour mode, or to full motion, for the life of the provider — with
      // every other property still appearing to respond.
      // The trailing colon is what the message puts after the last name it lists, so matching
      // it pins the property to the whole name rather than to a prefix of a longer one.
      expect(() => createTheme({}, widened({ [property]: "red" }))).toThrow(
        `stylesheet-owned property ${property}:`,
      );
    },
  );

  it("names every stylesheet-owned property it rejects", () => {
    expect(() =>
      createTheme(
        {},
        widened({ "--tandiko-lift": "0.1", "--tandiko-sink": "0.1" }),
      ),
    ).toThrow(/stylesheet-owned properties --tandiko-lift, --tandiko-sink/);
  });

  it("points a consumer at the stylesheet rule that can set a stylesheet-owned property", () => {
    expect(() =>
      createTheme({}, widened({ "--tandiko-accent": "red" })),
    ).toThrow(/stylesheet rule of your own/);
  });
});

describe("baseStylesheet", () => {
  it("carries the host-inheritance rule that an explicit colorMode overrides", () => {
    expect(baseStylesheet).toContain(
      // biome-ignore lint/security/noSecrets: a CSS selector, not a credential
      ':root[data-theme="dark"] .tandiko-root:not([data-tandiko-mode="light"])',
    );
  });

  it("drives the same dark overrides from a prefers-color-scheme query", () => {
    expect(baseStylesheet).toContain("@media (prefers-color-scheme: dark)");
    expect(baseStylesheet).toContain('.tandiko-root[data-tandiko-mode="dark"]');
    // One block per selector: explicit mode, host attribute, OS preference. `color-scheme:
    // dark` selects the dark arm of every light-dark() colour in the base rule, so the colours
    // need no override there — only the ramp scalars, which light-dark() cannot carry, are
    // reassigned alongside it.
    expect(baseStylesheet.match(/color-scheme: dark;/g)).toHaveLength(3);
  });

  it("assigns --tandiko-accent/-ink/-surface as light-dark() expressions in the base .tandiko-root rule, keyed off a light color-scheme", () => {
    // This is the ONLY place these three properties are ever assigned — createTheme()
    // deliberately excludes them from what ThemeProvider applies inline, so this rule (lower
    // specificity than every dark-mode selector) is what the dark overrides actually flip,
    // rather than losing to an inline value on the same element that no stylesheet rule could
    // ever beat. A dark selector reassigns color-scheme rather than the colours themselves:
    // light-dark() reads its arm from the element's computed color-scheme.
    const baseRuleMatch = baseStylesheet.match(/\.tandiko-root \{([^}]*)\}/);
    expect(baseRuleMatch).not.toBeNull();
    const baseRule = baseRuleMatch?.[1] ?? "";

    expect(baseRule).toContain("color-scheme: light;");
    expect(baseRule).toContain(
      "--tandiko-accent: light-dark(var(--tandiko-accent-light), var(--tandiko-accent-dark));",
    );
    expect(baseRule).toContain(
      "--tandiko-ink: light-dark(var(--tandiko-ink-light), var(--tandiko-ink-dark));",
    );
    expect(baseRule).toContain(
      "--tandiko-surface: light-dark(var(--tandiko-surface-light), var(--tandiko-surface-dark));",
    );
  });

  it("declares the full-motion durations in the base .tandiko-root rule", () => {
    const baseRule =
      baseStylesheet.match(/\.tandiko-root \{([^}]*)\}/)?.[1] ?? "";

    expect(baseRule).toContain("--tandiko-duration-fast: 120ms;");
    expect(baseRule).toContain("--tandiko-duration-normal: 200ms;");
    expect(baseRule).toContain("--tandiko-duration-slow: 320ms;");
  });

  it("collapses every duration under prefers-reduced-motion: reduce", () => {
    // A collapsed duration is 0.01ms rather than 0s so the transition still completes and
    // fires transitionend, leaving a listener that drives state off that event unstranded.
    const reducedBlock =
      baseStylesheet.match(
        /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
      )?.[1] ?? "";

    expect(reducedBlock).toContain("--tandiko-duration-fast: 0.01ms;");
    expect(reducedBlock).toContain("--tandiko-duration-normal: 0.01ms;");
    expect(reducedBlock).toContain("--tandiko-duration-slow: 0.01ms;");
  });
});

/**
 * The `--tandiko-*` properties `css` assigns, as opposed to the ones it reads.
 *
 * A declaration's name is the token left of its first colon; everything right of that colon is
 * the value, where `var(--tandiko-accent-light)` reads a property rather than assigning it.
 * Comments go first, so prose naming a property is not mistaken for either. Rule bodies never
 * nest, so inside a `;`-delimited segment the declaration is whatever follows the last brace —
 * that is what keeps the first declaration of a block, and the first inside a media query, from
 * being missed.
 */
function assignedProperties(css: string): Set<string> {
  const names = new Set<string>();
  for (const segment of css.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const declaration = segment.slice(
      Math.max(segment.lastIndexOf("{"), segment.lastIndexOf("}")) + 1,
    );
    const name = /^\s*(--[\w-]+)\s*:/.exec(declaration)?.[1];
    if (name !== undefined) {
      names.add(name);
    }
  }
  return names;
}

describe("the split between createTheme and the base stylesheet", () => {
  it("assigns from the stylesheet exactly the properties createTheme refuses as overrides", () => {
    // `ThemeOverrides` rejects a property because the stylesheet owns it. A property that
    // gains a declaration in the stylesheet without joining that list is one an override can
    // still shadow, pinning it to a single colour mode, or to full motion, for the life of the
    // provider — and nothing but this assertion notices.
    expect([...assignedProperties(baseStylesheet)].sort()).toEqual(
      [...STYLESHEET_OWNED_PROPERTIES].sort(),
    );
  });

  it("gives every stylesheet-owned property a value in the unconditional base rule", () => {
    // The mode and reduced-motion rules reassign; they do not introduce. A property declared
    // only inside one of them resolves to nothing in the other state, and every ramp reading it
    // back through `var()` falls to its guaranteed-invalid fallback.
    const baseRule =
      baseStylesheet.match(/\.tandiko-root \{([^}]*)\}/)?.[1] ?? "";

    expect([...assignedProperties(baseRule)].sort()).toEqual(
      [...STYLESHEET_OWNED_PROPERTIES].sort(),
    );
  });

  it("never assigns one property from both sides", () => {
    // `ThemeProvider` applies a `Theme` inline on `.tandiko-root`, the very element every rule
    // in the base stylesheet matches, so a property assigned from both sides takes the inline
    // value always and the stylesheet's declaration — including the one inside a mode or
    // reduced-motion rule — is dead on arrival (ADR-0007). Both sides are derived here rather
    // than restated, so the next property added to both is caught by this test rather than by
    // the mode that silently stops flipping.
    const assigned = assignedProperties(baseStylesheet);

    expect(
      Object.keys(createTheme()).filter((key) => assigned.has(key)),
      "properties assigned by both createTheme and the base stylesheet",
    ).toEqual([]);
  });
});

function differingKeys(a: Theme, b: Theme): string[] {
  const keys = new Set([
    ...Object.keys(a),
    ...Object.keys(b),
  ]) as Set<`--tandiko-${string}`>;
  return [...keys].filter((key) => a[key] !== b[key]);
}
