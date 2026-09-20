import { baseStylesheet, createTheme } from "@vipengele/react-tokens";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Pins a rendering-engine capability the theme depends on: that a relative-colour derivation
 * composes over a `light-dark()`-valued custom property.
 *
 * `packages/tokens` assigns each mode-resolved colour once, from its base stylesheet, as
 * `light-dark(var(--vpg-<x>-light), var(--vpg-<x>-dark))`, and moves it by reassigning
 * `color-scheme`. Every ramp then derives from that property, so the browser has to resolve
 * `oklch(from light-dark(a, b) ...)` per `color-scheme` to the correct — not merely different —
 * colour in each mode. That is a property of the engine, and these assertions measure the
 * engine on fixtures this file builds itself: the shipped theme's own resolution is guarded by
 * `theme-scalars.browser.test.ts`, which drives a real `ThemeProvider`.
 *
 * What they do pin to the package are the derivation's *inputs*. The seed colour and the ramp
 * expressions come from `createTheme()`, and the two ramp scalars are literals checked against
 * `baseStylesheet` below, so a change to the seed, to the ramp arithmetic or to a scalar either
 * flows through or fails here, rather than leaving a stale copy passing.
 *
 * The real ramps stack three levels of indirection: a custom property (`--vpg-state-shift`)
 * inside a `calc()` inside relative-colour syntax, over a base that is itself a custom property
 * holding a `light-dark()`. Each level is its own parse path, so each is asserted separately.
 *
 * jsdom computes nothing here, so these assertions only mean anything in a real engine.
 */

const theme = createTheme();

/**
 * Reads one entry of the real theme. Throwing on a missing key is what keeps the fixtures
 * traceable to `createTheme`: a renamed ramp or colour variant fails this file loudly instead of
 * silently baking `undefined` into the markup, where it would read as a dropped declaration
 * and still resolve to a colour.
 */
function themeValue(name: `--vpg-${string}`): string {
  const value = theme[name];
  if (value === undefined) {
    throw new Error(`createTheme() carries no ${name}`);
  }
  return value;
}

/**
 * The seed's light accent and the dark colour the theme derives from it. The dark variant is
 * a relative-colour expression reading `var(--vpg-accent-light)`, so both are declared
 * together on every fixture root and the browser resolves the pair.
 */
const ACCENT_DECLARATIONS = [
  `--vpg-accent-light: ${themeValue("--vpg-accent-light")};`,
  `--vpg-accent-dark: ${themeValue("--vpg-accent-dark")};`,
].join(" ");

/** The accent hover and press ramps, taken verbatim from the theme that ships them. */
const HOVER = themeValue("--vpg-accent-hover");
const PRESS = themeValue("--vpg-accent-press");

/**
 * The ramp scalars. Their signs differ: a hover step darkens on a light ground and lightens
 * on a dark one. Both are declarations inside the base stylesheet — the light one on
 * `.vpg-root`, the dark one in its dark block — so both are written out here and pinned
 * against that stylesheet by the assertions below.
 */
const SHIFT_LIGHT = "-0.05";
const SHIFT_DARK = "0.05";

/**
 * Splits a computed colour into its serialisation form and its numeric components, so two
 * colours can be compared without depending on which space Chromium serialises in or on
 * the last digit of a `calc()`.
 */
function parseColor(value: string): { form: string; components: number[] } {
  const form = value.replace(/[\d.%-]+/g, "").replace(/\s+/g, "");
  const components = (value.match(/-?[\d.]+/g) ?? []).map(Number);
  return { form, components };
}

function expectSameColor(actual: string, expected: string): void {
  const a = parseColor(actual);
  const e = parseColor(expected);
  expect(a.form).toBe(e.form);
  expect(a.components).toHaveLength(e.components.length);
  e.components.forEach((component, i) => {
    expect(a.components[i]).toBeCloseTo(component, 2);
  });
}

const hosts: HTMLDivElement[] = [];

afterEach(() => {
  for (const host of hosts.splice(0)) {
    host.remove();
  }
});

/**
 * Mounts `markup` and reads back the `background-color` of `#derived`, `#reference` and
 * `#base`.
 *
 * Comparing against a reference element rather than a literal string keeps the assertion
 * independent of the colour space Chromium serialises in, while still failing if the
 * derivation drops a term.
 */
function mount(markup: string): {
  derived: string;
  reference: string;
  base: string;
} {
  const container = document.createElement("div");
  hosts.push(container);
  container.innerHTML = markup;
  document.body.append(container);

  const read = (id: string) => {
    const element = container.querySelector(`#${id}`);
    return element ? getComputedStyle(element).backgroundColor : "";
  };

  return {
    derived: read("derived"),
    reference: read("reference"),
    base: read("base"),
  };
}

/**
 * The control: the same ramp over the same scalar, but with `--vpg-accent` assigned
 * straight from one arm, so `light-dark()` plays no part in producing the expected colour.
 */
function referenceMarkup(arm: "light" | "dark", shift: string, derivation: string): string {
  return `
    <div style="${ACCENT_DECLARATIONS} --vpg-accent: var(--vpg-accent-${arm}); --vpg-state-shift: ${shift};">
      <div id="reference" style="background-color: ${derivation};"></div>
    </div>
  `;
}

/** A derivation whose scalars are inline and mode-invariant: only the base colour switches. */
function resolveInline(scheme: "light" | "dark", derivation: string): { derived: string; reference: string; base: string } {
  return mount(`
    <div style="color-scheme: ${scheme}; ${ACCENT_DECLARATIONS} --vpg-accent: light-dark(var(--vpg-accent-light), var(--vpg-accent-dark)); --vpg-state-shift: ${SHIFT_LIGHT};">
      <div id="base" style="background-color: var(--vpg-accent);"></div>
      <div id="derived" style="background-color: ${derivation};"></div>
    </div>
    ${referenceMarkup(scheme, SHIFT_LIGHT, derivation)}
  `);
}

/**
 * The shape the package ships: one rule sets the base colour, `color-scheme: light` and the
 * light-mode scalar, and a mode rule reassigns `color-scheme` and the scalar together —
 * mirroring `.vpg-root` and `DARK_DECLARATIONS` in `@vipengele/react-tokens`' base stylesheet.
 * Pinning the light side to `color-scheme: light` is what makes the dark rule's own
 * `color-scheme` the only thing that can select the dark arm.
 */
function resolveModeDriven(mode: "light" | "dark"): {
  derived: string;
  reference: string;
  base: string;
} {
  return mount(`
    <style>
      .spike-root {
        color-scheme: light;
        ${ACCENT_DECLARATIONS}
        --vpg-accent: light-dark(var(--vpg-accent-light), var(--vpg-accent-dark));
        --vpg-state-shift: ${SHIFT_LIGHT};
      }
      .spike-root[data-vpg-mode="dark"] {
        color-scheme: dark;
        --vpg-state-shift: ${SHIFT_DARK};
      }
    </style>
    <div class="spike-root"${mode === "dark" ? ' data-vpg-mode="dark"' : ""}>
      <div id="base" style="background-color: var(--vpg-accent);"></div>
      <div id="derived" style="background-color: ${HOVER};"></div>
    </div>
    ${referenceMarkup(mode, mode === "dark" ? SHIFT_DARK : SHIFT_LIGHT, HOVER)}
  `);
}

describe("the spike's inputs", () => {
  it("takes the light-mode scalar the base stylesheet declares", () => {
    expect(baseStylesheet).toContain(`--vpg-state-shift: ${SHIFT_LIGHT};`);
  });

  it("takes the dark-mode scalar the base stylesheet declares", () => {
    expect(baseStylesheet).toContain(`--vpg-state-shift: ${SHIFT_DARK};`);
  });
});

describe("a relative-colour ramp over a light-dark() custom property", () => {
  it("resolves to a real colour in both modes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const { derived } = resolveInline(scheme, HOVER);
      expect(derived).not.toBe("");
      expect(derived).not.toBe("rgba(0, 0, 0, 0)");
    }
  });

  it("picks the light-dark() arm matching color-scheme before deriving", () => {
    const light = resolveInline("light", HOVER);
    const dark = resolveInline("dark", HOVER);
    expect(light.derived).not.toBe(dark.derived);
  });

  it("applies the scalar rather than passing the base colour through", () => {
    const light = resolveInline("light", HOVER);
    expect(light.derived).not.toBe(light.base);
    const dark = resolveInline("dark", HOVER);
    expect(dark.derived).not.toBe(dark.base);
  });

  it("resolves a var() scalar inside calc() against the light arm", () => {
    const { derived, reference } = resolveInline("light", HOVER);
    expectSameColor(derived, reference);
  });

  it("resolves a var() scalar inside calc() against the dark arm", () => {
    const { derived, reference } = resolveInline("dark", HOVER);
    expectSameColor(derived, reference);
  });

  it("multiplies a var() scalar inside calc() against the light arm", () => {
    const { derived, reference } = resolveInline("light", PRESS);
    expectSameColor(derived, reference);
  });

  it("multiplies a var() scalar inside calc() against the dark arm", () => {
    const { derived, reference } = resolveInline("dark", PRESS);
    expectSameColor(derived, reference);
  });
});

describe("a mode rule reassigning color-scheme and the ramp scalar together", () => {
  it("derives from the light arm with the light scalar", () => {
    const { derived, reference } = resolveModeDriven("light");
    expectSameColor(derived, reference);
  });

  it("derives from the dark arm with the dark scalar", () => {
    const { derived, reference } = resolveModeDriven("dark");
    expectSameColor(derived, reference);
  });

  it("shifts lightness in opposite directions in the two modes", () => {
    const light = resolveModeDriven("light");
    const dark = resolveModeDriven("dark");
    // The light hover darkens its base and the dark hover lightens its own, so neither the
    // arms nor the scalars can have been silently shared between the two modes.
    expect(parseColor(light.derived).components[0]).toBeLessThan(parseColor(light.base).components[0] as number);
    expect(parseColor(dark.derived).components[0]).toBeGreaterThan(parseColor(dark.base).components[0] as number);
  });
});
