import { describe, expect, it } from "vitest";
import { baseStylesheet } from "./base-stylesheet.js";
import { createTheme, STYLESHEET_OWNED_PROPERTIES, type Theme, type ThemeOverrides } from "./theme.js";

const EXPECTED_KEYS = [
  "--vpg-accent-light",
  "--vpg-danger-light",
  "--vpg-ink-light",
  "--vpg-surface-light",
  "--vpg-accent-dark",
  "--vpg-danger-dark",
  "--vpg-ink-dark",
  "--vpg-surface-dark",
  "--vpg-accent-hover",
  "--vpg-accent-press",
  "--vpg-accent-wash",
  "--vpg-accent-ring",
  "--vpg-accent-contrast",
  "--vpg-accent-visited",
  "--vpg-danger-hover",
  "--vpg-danger-press",
  "--vpg-danger-ring",
  "--vpg-danger-contrast",
  "--vpg-danger-visited",
  "--vpg-ink-muted",
  "--vpg-ink-subtle",
  "--vpg-border",
  "--vpg-border-strong",
  "--vpg-surface-raised",
  "--vpg-surface-sunken",
  "--vpg-surface-hover",
  "--vpg-surface-press",
  "--vpg-radius",
  "--vpg-radius-sm",
  "--vpg-radius-lg",
  "--vpg-radius-full",
  "--vpg-font-sans",
  "--vpg-font-mono",
  "--vpg-size-xs",
  "--vpg-size-sm",
  "--vpg-size-md",
  "--vpg-size-lg",
  "--vpg-size-xl",
  "--vpg-size-2xl",
  "--vpg-icon-sm",
  "--vpg-icon-md",
  "--vpg-icon-lg",
  "--vpg-icon-xl",
  "--vpg-space-1",
  "--vpg-space-2",
  "--vpg-space-3",
  "--vpg-space-4",
  "--vpg-space-5",
  "--vpg-space-6",
  "--vpg-space-7",
  "--vpg-space-8",
  "--vpg-font-size-xs",
  "--vpg-font-size-sm",
  "--vpg-font-size-md",
  "--vpg-font-size-lg",
  "--vpg-font-size-xl",
  "--vpg-font-size-2xl",
  "--vpg-font-size-3xl",
  "--vpg-font-size-4xl",
  "--vpg-font-size-5xl",
  "--vpg-font-weight-regular",
  "--vpg-font-weight-medium",
  "--vpg-font-weight-semibold",
  "--vpg-font-weight-bold",
  "--vpg-line-height-tight",
  "--vpg-line-height-snug",
  "--vpg-line-height-normal",
  "--vpg-line-height-relaxed",
  "--vpg-letter-spacing-tight",
  "--vpg-letter-spacing-normal",
  "--vpg-letter-spacing-wide",
  "--vpg-focus-ring-width",
  "--vpg-focus-ring-offset",
  "--vpg-ease-standard",
  "--vpg-ease-entrance",
  "--vpg-ease-exit",
  "--vpg-shadow-low",
  "--vpg-shadow-med",
  "--vpg-shadow-high",
  "--vpg-layer-listbox",
  "--vpg-layer-popover",
  "--vpg-layer-tooltip",
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

  it("names every property under the --vpg- prefix", () => {
    for (const key of Object.keys(createTheme())) {
      expect(key.startsWith("--vpg-")).toBe(true);
    }
  });

  it("never sets --vpg-accent/-ink/-surface/-danger inline, so the dark-mode stylesheet rule can override them", () => {
    // An inline style declaration always wins over a stylesheet selector for the same
    // property on the same element, no matter how specific that selector is. If these
    // four were part of the object ThemeProvider applies inline, no CSS rule — including
    // baseStylesheet's own dark-mode overrides — could ever change them.
    const theme = createTheme();

    expect(theme).not.toHaveProperty("--vpg-accent");
    expect(theme).not.toHaveProperty("--vpg-ink");
    expect(theme).not.toHaveProperty("--vpg-surface");
    expect(theme).not.toHaveProperty("--vpg-danger");
  });

  it("leaves the other seeds at their defaults when one is overridden", () => {
    const defaults = createTheme();
    const custom = createTheme({ accent: "oklch(0.7 0.2 30)" });

    expect(custom["--vpg-accent-light"]).toBe("oklch(0.7 0.2 30)");
    // Every other entry is a CSS expression reading the seed back through `var()`, so an
    // accent override changes exactly one entry and the ramp re-derives in the browser.
    expect(differingKeys(defaults, custom)).toEqual(["--vpg-accent-light"]);
  });

  it("applies each seed field independently", () => {
    const theme = createTheme({
      accent: "oklch(0.5 0.1 120)",
      danger: "oklch(0.6 0.2 20)",
      ink: "oklch(0.1 0 0)",
      surface: "oklch(1 0 0)",
      radius: "2px",
      fontSans: "Inter",
      fontMono: "Fira Code",
    });

    expect(theme["--vpg-accent-light"]).toBe("oklch(0.5 0.1 120)");
    expect(theme["--vpg-danger-light"]).toBe("oklch(0.6 0.2 20)");
    expect(theme["--vpg-ink-light"]).toBe("oklch(0.1 0 0)");
    expect(theme["--vpg-surface-light"]).toBe("oklch(1 0 0)");
    expect(theme["--vpg-radius"]).toBe("2px");
    expect(theme["--vpg-font-sans"]).toBe("Inter");
    expect(theme["--vpg-font-mono"]).toBe("Fira Code");
  });

  it("scales the radius steps off the seed at 0.75x and 1.5x", () => {
    // The multipliers are the whole radius ladder: at the default 0.5rem seed they land the
    // inner step on 6px and the outer on 12px, and keeping both as `calc()` over
    // `--vpg-radius` is what makes a reseeded radius move all three together. The pixels
    // themselves are only measurable in an engine — `theme-scalars.browser.test.ts` in
    // `@vipengele/react-ui` resolves them.
    const theme = createTheme();

    expect(theme["--vpg-radius-sm"]).toBe("calc(var(--vpg-radius) * 0.75)");
    expect(theme["--vpg-radius-lg"]).toBe("calc(var(--vpg-radius) * 1.5)");
  });

  it("derives the dependent-state ramps as oklch relative colours, not JS-computed values", () => {
    const theme = createTheme();

    expect(theme["--vpg-accent-hover"]).toContain("oklch(from var(--vpg-accent)");
    expect(theme["--vpg-accent-press"]).toContain("oklch(from var(--vpg-accent)");
    expect(theme["--vpg-accent-wash"]).toContain("oklch(from var(--vpg-accent)");
    expect(theme["--vpg-surface-hover"]).toContain("oklch(from var(--vpg-surface)");
    expect(theme["--vpg-ink-muted"]).toContain("oklch(from var(--vpg-ink)");
  });

  it("carries the default danger seed verbatim, so light mode renders that exact red", () => {
    // `--vpg-danger` resolves to the light arm of a light-dark() over the two variants, and
    // the light variant is the seed untouched: an error state in light mode renders the seed.
    expect(createTheme()["--vpg-danger-light"]).toBe("oklch(0.55 0.21 27)");
  });

  it("derives the danger ramp from --vpg-danger, at the same steps and ring alpha as the accent", () => {
    const theme = createTheme();

    expect(theme["--vpg-danger-hover"]).toBe(theme["--vpg-accent-hover"]?.replaceAll("--vpg-accent", "--vpg-danger"));
    expect(theme["--vpg-danger-press"]).toBe(theme["--vpg-accent-press"]?.replaceAll("--vpg-accent", "--vpg-danger"));
    expect(theme["--vpg-danger-ring"]).toBe("oklch(from var(--vpg-danger) l c h / 0.45)");
    expect(theme["--vpg-danger-contrast"]).toBe(theme["--vpg-accent-contrast"]?.replaceAll("--vpg-accent", "--vpg-danger"));
    expect(theme["--vpg-danger-visited"]).toBe(theme["--vpg-accent-visited"]?.replaceAll("--vpg-accent", "--vpg-danger"));
  });

  it("derives the dark variants from the light variants, so no property depends on itself", () => {
    const theme = createTheme();

    expect(theme["--vpg-accent-dark"]).toContain("var(--vpg-accent-light)");
    expect(theme["--vpg-danger-dark"]).toContain("var(--vpg-danger-light)");
    expect(theme["--vpg-ink-dark"]).toContain("var(--vpg-ink-light)");
    expect(theme["--vpg-surface-dark"]).toContain("var(--vpg-surface-light)");
    for (const lightKey of ["--vpg-accent-light", "--vpg-danger-light", "--vpg-ink-light", "--vpg-surface-light"] as const) {
      expect(theme[lightKey]).not.toContain("var(");
    }
  });

  it("freezes the result", () => {
    const theme = createTheme();

    expect(Object.isFrozen(theme)).toBe(true);
    expect(() => {
      (theme as Record<string, string>)["--vpg-accent-light"] = "red";
    }).toThrow(TypeError);
    expect(theme["--vpg-accent-light"]).toBe("oklch(0.58 0.19 264)");
  });

  it("round-trips through JSON as a flat object of string keys and values", () => {
    const theme = createTheme({ accent: "oklch(0.7 0.2 30)" });
    const roundTripped: unknown = JSON.parse(JSON.stringify(theme));

    expect(roundTripped).toEqual({ ...theme });
    for (const value of Object.values(roundTripped as Record<string, unknown>)) {
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
    const theme = createTheme({ radius: "2px" }, { "--vpg-radius": "9px" });

    expect(theme["--vpg-radius"]).toBe("9px");
  });

  it("changes nothing but the properties it names", () => {
    const seeded = createTheme({ accent: "oklch(0.7 0.2 30)" });
    const overridden = createTheme({ accent: "oklch(0.7 0.2 30)" }, { "--vpg-space-4": "1.25rem", "--vpg-radius-full": "999px" });

    expect(differingKeys(seeded, overridden).sort()).toEqual(["--vpg-radius-full", "--vpg-space-4"]);
  });

  it("carries a --vpg-* property createTheme does not emit", () => {
    const theme = createTheme({}, { "--vpg-brand-glow": "0 0 12px red" });

    expect(theme["--vpg-brand-glow"]).toBe("0 0 12px red");
  });

  it("produces the same theme as the seed alone when no override is given", () => {
    expect({ ...createTheme({ ink: "oklch(0.1 0 0)" }, {}) }).toEqual({
      ...createTheme({ ink: "oklch(0.1 0 0)" }),
    });
  });

  it("freezes the composed result", () => {
    const theme = createTheme({}, { "--vpg-radius": "9px" });

    expect(Object.isFrozen(theme)).toBe(true);
  });

  it.each(STYLESHEET_OWNED_PROPERTIES)("throws rather than shadowing the base stylesheet's %s", (property) => {
    // An override lands inline on `.vpg-root`, the very element the mode and
    // reduced-motion rules match, so a stylesheet-owned property accepted here would pin that
    // property to one colour mode, or to full motion, for the life of the provider — with
    // every other property still appearing to respond.
    // The trailing colon is what the message puts after the last name it lists, so matching
    // it pins the property to the whole name rather than to a prefix of a longer one.
    expect(() => createTheme({}, widened({ [property]: "red" }))).toThrow(`stylesheet-owned property ${property}:`);
  });

  it("names every stylesheet-owned property it rejects", () => {
    expect(() => createTheme({}, widened({ "--vpg-lift": "0.1", "--vpg-sink": "0.1" }))).toThrow(
      /stylesheet-owned properties --vpg-lift, --vpg-sink/,
    );
  });

  it("points a consumer at the stylesheet rule that can set a stylesheet-owned property", () => {
    expect(() => createTheme({}, widened({ "--vpg-accent": "red" }))).toThrow(/stylesheet rule of your own/);
  });
});

describe("baseStylesheet", () => {
  it("carries the host-inheritance rule that an explicit colorMode overrides", () => {
    expect(baseStylesheet).toContain(
      // biome-ignore lint/security/noSecrets: a CSS selector, not a credential
      ':root[data-theme="dark"] .vpg-root:not([data-vpg-mode="light"])',
    );
  });

  it("drives the same dark overrides from a prefers-color-scheme query", () => {
    expect(baseStylesheet).toContain("@media (prefers-color-scheme: dark)");
    expect(baseStylesheet).toContain('.vpg-root[data-vpg-mode="dark"]');
    // One block per selector: explicit mode, host attribute, OS preference. `color-scheme:
    // dark` selects the dark arm of every light-dark() colour in the base rule, so the colours
    // need no override there — only the ramp scalars, which light-dark() cannot carry, are
    // reassigned alongside it.
    expect(baseStylesheet.match(/color-scheme: dark;/g)).toHaveLength(3);
  });

  it("assigns --vpg-accent/-ink/-surface/-danger as light-dark() expressions in the base .vpg-root rule, keyed off a light color-scheme", () => {
    // This is the ONLY place these four properties are ever assigned — createTheme()
    // deliberately excludes them from what ThemeProvider applies inline, so this rule (lower
    // specificity than every dark-mode selector) is what the dark overrides actually flip,
    // rather than losing to an inline value on the same element that no stylesheet rule could
    // ever beat. A dark selector reassigns color-scheme rather than the colours themselves:
    // light-dark() reads its arm from the element's computed color-scheme.
    const baseRuleMatch = baseStylesheet.match(/\.vpg-root \{([^}]*)\}/);
    expect(baseRuleMatch).not.toBeNull();
    const baseRule = baseRuleMatch?.[1] ?? "";

    expect(baseRule).toContain("color-scheme: light;");
    expect(baseRule).toContain("--vpg-accent: light-dark(var(--vpg-accent-light), var(--vpg-accent-dark));");
    expect(baseRule).toContain("--vpg-ink: light-dark(var(--vpg-ink-light), var(--vpg-ink-dark));");
    expect(baseRule).toContain("--vpg-surface: light-dark(var(--vpg-surface-light), var(--vpg-surface-dark));");
    expect(baseRule).toContain("--vpg-danger: light-dark(var(--vpg-danger-light), var(--vpg-danger-dark));");
  });

  it("declares the full-motion durations in the base .vpg-root rule", () => {
    const baseRule = baseStylesheet.match(/\.vpg-root \{([^}]*)\}/)?.[1] ?? "";

    expect(baseRule).toContain("--vpg-duration-fast: 120ms;");
    expect(baseRule).toContain("--vpg-duration-normal: 200ms;");
    expect(baseRule).toContain("--vpg-duration-slow: 320ms;");
  });

  it("collapses every duration under prefers-reduced-motion: reduce", () => {
    // A collapsed duration is 0.01ms rather than 0s so the transition still completes and
    // fires transitionend, leaving a listener that drives state off that event unstranded.
    const reducedBlock = baseStylesheet.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(reducedBlock).toContain("--vpg-duration-fast: 0.01ms;");
    expect(reducedBlock).toContain("--vpg-duration-normal: 0.01ms;");
    expect(reducedBlock).toContain("--vpg-duration-slow: 0.01ms;");
  });
});

/**
 * The `--vpg-*` properties `css` assigns, as opposed to the ones it reads.
 *
 * A declaration's name is the token left of its first colon; everything right of that colon is
 * the value, where `var(--vpg-accent-light)` reads a property rather than assigning it.
 * Comments go first, so prose naming a property is not mistaken for either. Rule bodies never
 * nest, so inside a `;`-delimited segment the declaration is whatever follows the last brace —
 * that is what keeps the first declaration of a block, and the first inside a media query, from
 * being missed.
 */
function assignedProperties(css: string): Set<string> {
  const names = new Set<string>();
  for (const segment of css.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const declaration = segment.slice(Math.max(segment.lastIndexOf("{"), segment.lastIndexOf("}")) + 1);
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
    expect([...assignedProperties(baseStylesheet)].sort()).toEqual([...STYLESHEET_OWNED_PROPERTIES].sort());
  });

  it("gives every stylesheet-owned property a value in the unconditional base rule", () => {
    // The mode and reduced-motion rules reassign; they do not introduce. A property declared
    // only inside one of them resolves to nothing in the other state, and every ramp reading it
    // back through `var()` falls to its guaranteed-invalid fallback.
    const baseRule = baseStylesheet.match(/\.vpg-root \{([^}]*)\}/)?.[1] ?? "";

    expect([...assignedProperties(baseRule)].sort()).toEqual([...STYLESHEET_OWNED_PROPERTIES].sort());
  });

  it("never assigns one property from both sides", () => {
    // `ThemeProvider` applies a `Theme` inline on `.vpg-root`, the very element every rule
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
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<`--vpg-${string}`>;
  return [...keys].filter((key) => a[key] !== b[key]);
}
