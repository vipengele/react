import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SegmentedControl, type SegmentedControlOption, type SegmentedControlProps } from "./SegmentedControl.js";

/**
 * Every height, colour, ring and duration the control has is a `var()` the cascade resolves, and
 * the selected state is a `:has(> :checked)` match — jsdom lays nothing out, resolves no custom
 * property and reports the authored string for each, so none of these assertions would mean
 * anything there.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one radio group.
afterEach(cleanup);

/** Two labels of clearly different lengths, so a width shared equally cannot be an accident. */
const OPTIONS: readonly SegmentedControlOption[] = [
  { value: "day", label: "Day" },
  { value: "fortnight", label: "A whole fortnight at a glance" },
];

/** Mounts `children` under a real provider, so every `--vpg-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

function renderControl(props: Partial<SegmentedControlProps> = {}): HTMLElement {
  renderThemed(<SegmentedControl aria-label="Range" options={OPTIONS} {...props} />);
  return screen.getByRole("radiogroup", { name: "Range" });
}

/** The segment — the `<label>` that draws the fill and the ring — wrapping the named radio. */
function segmentOf(name: string): HTMLElement {
  return screen.getByRole("radio", { name }).closest("label") as HTMLElement;
}

/**
 * Finishes the control's transitions before reading it. Background-color, color and box-shadow
 * interpolate over the fast motion duration, and a read taken mid-transition sees a blend of the
 * two states rather than either.
 */
function settled(control: Element): void {
  for (const animation of control.getAnimations({ subtree: true })) {
    animation.finish();
  }
}

/**
 * Resolves `value` for `property` on a probe inside the mounted root, so the expected value is
 * whatever the engine computes for the token — serialised the same way as the element under
 * test — rather than a literal copied from the theme.
 */
function resolved(property: string, value: string): string {
  const probe = document.createElement("span");
  probe.style.setProperty(property, value);
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const computed = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return computed;
}

/** Resolves a token to the colour the engine computes for it inside the mounted root. */
function resolvedColour(token: string): string {
  return resolved("color", `var(${token})`);
}

/** Resolves a length token to its pixel value inside the mounted root. */
function resolvedLength(token: string): number {
  return Number.parseFloat(resolved("min-height", `var(${token})`));
}

describe("SegmentedControl heights", () => {
  const SIZES = [
    ["sm", "--vpg-size-sm"],
    ["md", "--vpg-size-md"],
    ["lg", "--vpg-size-xl"],
  ] as const;

  for (const [size, token] of SIZES) {
    it(`lays the ${size} control out at the height ${token} resolves to`, () => {
      const control = renderControl({ size });

      const expected = resolvedLength(token);
      expect(expected).toBeGreaterThan(0);
      expect(control.getBoundingClientRect().height).toBeCloseTo(expected, 1);
    });
  }

  it("gives each size a strictly taller control than the one below it", () => {
    const heights = SIZES.map(([size]) => {
      const height = renderControl({ size }).getBoundingClientRect().height;
      cleanup();
      return height;
    });

    const [sm, md, lg] = heights as [number, number, number];
    expect(md).toBeGreaterThan(sm);
    expect(lg).toBeGreaterThan(md);
  });
});

describe("SegmentedControl width", () => {
  it("shares a full-width control's width equally between segments whatever their labels hold", () => {
    renderThemed(
      <div style={{ width: "640px" }}>
        <SegmentedControl aria-label="Range" options={OPTIONS} fullWidth />
      </div>,
    );
    const control = screen.getByRole("radiogroup", { name: "Range" });
    const short = segmentOf("Day").getBoundingClientRect().width;
    const long = segmentOf("A whole fortnight at a glance").getBoundingClientRect().width;

    expect(control.getBoundingClientRect().width).toBeCloseTo(640, 1);
    expect(short).toBeGreaterThan(0);
    expect(short).toBeCloseTo(long, 1);
  });

  it("sizes each segment of a content-width control to its own label", () => {
    renderThemed(
      <div style={{ width: "640px" }}>
        <SegmentedControl aria-label="Range" options={OPTIONS} />
      </div>,
    );
    const control = screen.getByRole("radiogroup", { name: "Range" });
    const short = segmentOf("Day").getBoundingClientRect().width;
    const long = segmentOf("A whole fortnight at a glance").getBoundingClientRect().width;

    expect(long).toBeGreaterThan(short * 2);
    expect(control.getBoundingClientRect().width).toBeLessThan(640);
  });
});

describe("SegmentedControl colours", () => {
  it("fills the selected segment with the raised surface and full ink", () => {
    settled(renderControl({ defaultValue: "day" }));
    const selected = getComputedStyle(segmentOf("Day"));

    expect(selected.backgroundColor).toBe(resolvedColour("--vpg-surface-raised"));
    expect(selected.color).toBe(resolvedColour("--vpg-ink"));
    expect(selected.boxShadow).not.toBe("none");
  });

  it("leaves an unselected segment unfilled in muted ink", () => {
    settled(renderControl({ defaultValue: "day" }));
    const unselected = getComputedStyle(segmentOf("A whole fortnight at a glance"));

    expect(unselected.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(unselected.color).toBe(resolvedColour("--vpg-ink-muted"));
    expect(unselected.boxShadow).toBe("none");
    // Muted and full ink must resolve apart, or the colour assertions above separate nothing.
    expect(resolvedColour("--vpg-ink-muted")).not.toBe(resolvedColour("--vpg-ink"));
  });

  it("moves the fill to the segment the user selects once the transition settles", async () => {
    const control = renderControl({ defaultValue: "day" });

    await userEvent.click(segmentOf("A whole fortnight at a glance"));
    settled(control);

    const selected = getComputedStyle(segmentOf("A whole fortnight at a glance"));
    const unselected = getComputedStyle(segmentOf("Day"));
    expect(selected.backgroundColor).toBe(resolvedColour("--vpg-surface-raised"));
    expect(selected.color).toBe(resolvedColour("--vpg-ink"));
    expect(unselected.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(unselected.color).toBe(resolvedColour("--vpg-ink-muted"));
  });
});

describe("SegmentedControl focus ring", () => {
  it("rings the segment whose radio takes keyboard focus, and no other", async () => {
    renderControl({ defaultValue: "fortnight" });

    await userEvent.tab();

    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "A whole fortnight at a glance" }));
    const ring = getComputedStyle(segmentOf("A whole fortnight at a glance"));
    expect(ring.outlineStyle).toBe("solid");
    expect(Number.parseFloat(ring.outlineWidth)).toBeCloseTo(resolvedLength("--vpg-focus-ring-width"), 1);
    expect(Number.parseFloat(ring.outlineWidth)).toBeGreaterThan(0);
    expect(ring.outlineColor).toBe(resolvedColour("--vpg-accent-ring"));
    expect(getComputedStyle(segmentOf("Day")).outlineStyle).toBe("none");
  });
});

describe("SegmentedControl motion", () => {
  it("transitions each segment over the duration --vpg-duration-fast resolves to", () => {
    renderControl({ defaultValue: "day" });
    const expected = resolved("transition-duration", "var(--vpg-duration-fast)");

    const durations = getComputedStyle(segmentOf("Day")).transitionDuration.split(", ");

    // One entry per transitioned property — background-color, color and box-shadow.
    expect(durations).toEqual([expected, expected, expected]);
  });
});
