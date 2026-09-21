import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { FieldSet } from "../FieldSet/FieldSet.js";
import { Checkbox } from "./Checkbox.js";

/**
 * The box draws nothing of its own: every state it has is a `::before` glyph and a `var()` the
 * cascade resolves, so jsdom — which lays nothing out and resolves no custom property — reports
 * the same computed style for all three states and for both colour modes.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one box.
afterEach(cleanup);

/** The three properties the stylesheet tells the states apart with, read off the glyph. */
interface Glyph {
  content: string;
  backgroundColor: string;
  opacity: string;
}

/**
 * Finishes the box's transitions before reading it. Opacity and background-color interpolate over
 * the fast motion duration, and a read taken mid-transition sees a blend of the two states rather
 * than either.
 */
function glyphOf(box: Element): Glyph {
  for (const animation of box.getAnimations({ subtree: true })) {
    animation.finish();
  }

  const before = getComputedStyle(box, "::before");
  return { content: before.content, backgroundColor: before.backgroundColor, opacity: before.opacity };
}

/** Resolves a token to the colour the engine computes for it inside the mounted root. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

/** Mounts `children` under a real provider, so every `--vpg-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

function renderBox(props: { defaultChecked?: boolean; indeterminate?: boolean } = {}): HTMLInputElement {
  renderThemed(<Checkbox aria-label="Agree" {...props} />);
  return screen.getByRole("checkbox", { name: "Agree" }) as HTMLInputElement;
}

describe("the Checkbox glyph under a real ThemeProvider", () => {
  it("draws a distinct glyph for each of the three states", () => {
    const unchecked = glyphOf(renderBox());
    cleanup();
    const checked = glyphOf(renderBox({ defaultChecked: true }));
    cleanup();
    const indeterminate = glyphOf(renderBox({ indeterminate: true }));

    // Pairwise, because two states sharing a glyph are indistinguishable to whoever is reading the
    // box — and checked and indeterminate differ in `content` while indeterminate and unchecked
    // differ only in `background-color` and `opacity`, so no single property separates all three.
    expect(unchecked).not.toEqual(checked);
    expect(checked).not.toEqual(indeterminate);
    expect(indeterminate).not.toEqual(unchecked);
  });

  it("hides the glyph entirely while the box is unchecked", () => {
    const glyph = glyphOf(renderBox());

    expect(glyph.opacity).toBe("0");
    expect(glyph.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("shows an opaque tick character when the box is checked", () => {
    const glyph = glyphOf(renderBox({ defaultChecked: true }));

    expect(glyph.content).toContain("✓");
    expect(glyph.opacity).toBe("1");
  });

  it("shows an opaque contrast-coloured bar when the box is indeterminate", () => {
    const box = renderBox({ indeterminate: true });
    const glyph = glyphOf(box);

    expect(glyph.content).not.toContain("✓");
    expect(glyph.opacity).toBe("1");
    expect(glyph.backgroundColor).toBe(resolvedColour("--vpg-accent-contrast"));
  });

  it("fills the box itself with the accent in both marked states", () => {
    const unchecked = getComputedStyle(renderBox()).backgroundColor;
    cleanup();
    const checked = getComputedStyle(renderBox({ defaultChecked: true }));

    expect(checked.backgroundColor).toBe(resolvedColour("--vpg-accent"));
    expect(checked.backgroundColor).not.toBe(unchecked);
  });
});

describe("Checkbox interaction in a real engine", () => {
  it("toggles the box when the label text beside it is clicked", async () => {
    renderThemed(<Checkbox label="Agree" />);
    const box = screen.getByRole("checkbox", { name: "Agree" }) as HTMLInputElement;

    await userEvent.click(screen.getByText("Agree"));

    expect(box.checked).toBe(true);
  });

  it("draws the focus ring when the box takes keyboard focus", async () => {
    const box = renderBox();

    await userEvent.tab();

    expect(document.activeElement).toBe(box);
    const outline = getComputedStyle(box);
    expect(outline.outlineStyle).toBe("solid");
    expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThan(0);
    expect(outline.outlineColor).toBe(resolvedColour("--vpg-accent-ring"));
  });
});

describe("Checkbox layout stability", () => {
  // The box's `::before` holds a tick character when checked and nothing otherwise, and an inline
  // grid takes its baseline from its first line of text. A baseline that depends on the state
  // moves everything aligned to it when the box is toggled.
  it("keeps a labelled row where it is when the box is toggled", async () => {
    renderThemed(
      <p>
        Terms <Checkbox label="Agree" />
      </p>,
    );
    const box = screen.getByRole("checkbox", { name: "Agree" }) as HTMLInputElement;
    const row = box.closest("label") as HTMLElement;
    const label = screen.getByText("Agree");

    const before = { row: row.getBoundingClientRect().top, label: label.getBoundingClientRect().top };
    await userEvent.click(box);
    const after = { row: row.getBoundingClientRect().top, label: label.getBoundingClientRect().top };

    expect(box.checked).toBe(true);
    // Layout snaps to 1/64px, so a sub-pixel difference is rounding rather than movement.
    expect(after.row).toBeCloseTo(before.row, 1);
    expect(after.label).toBeCloseTo(before.label, 1);
  });

  it("keeps a controlled labelled row where it is when its checked prop changes", () => {
    const { rerender } = renderThemed(
      <p>
        Terms <Checkbox label="Agree" checked={false} onChange={() => {}} />
      </p>,
    );
    const row = screen.getByRole("checkbox").closest("label") as HTMLElement;

    const before = row.getBoundingClientRect().top;
    rerender(
      <ThemeProvider>
        <p>
          Terms <Checkbox label="Agree" checked onChange={() => {}} />
        </p>
      </ThemeProvider>,
    );

    expect(row.getBoundingClientRect().top).toBeCloseTo(before, 1);
  });

  it("keeps a bare box where it is when it is toggled", async () => {
    renderThemed(
      <p>
        Terms <Checkbox aria-label="Agree" />
      </p>,
    );
    const box = screen.getByRole("checkbox", { name: "Agree" }) as HTMLInputElement;

    const before = box.getBoundingClientRect().top;
    await userEvent.click(box);

    expect(box.checked).toBe(true);
    expect(box.getBoundingClientRect().top).toBe(before);
  });
});

describe("Checkbox rows inside a FieldSet", () => {
  it("spaces consecutive rows by the step the fieldset pads itself with", () => {
    const { container } = renderThemed(
      <FieldSet legend="Terms">
        <Checkbox label="Agree" />
        <Checkbox label="Subscribe" />
      </FieldSet>,
    );

    const fieldSet = container.querySelector(".vpg-fieldset") as HTMLElement;
    const rows = fieldSet.querySelectorAll(":scope > label.vpg-checkbox-row");
    // React 19 hoists each `<style precedence>` into the head, so the wrapping labels are the
    // fieldset's own consecutive children — which is what the sibling-combinator rule counts. A
    // style element left in place between them would be the sibling that rule spaces instead.
    expect(rows).toHaveLength(2);

    const [first, second] = [...rows] as HTMLElement[];
    // The fieldset pads itself with the same step it spaces its children by, so the resolved
    // padding is the length the sibling rule has to produce — no literal stands in for it.
    const step = getComputedStyle(fieldSet).paddingTop;
    expect(Number.parseFloat(step)).toBeGreaterThan(0);
    expect(getComputedStyle(first as Element).marginTop).toBe("0px");
    expect(getComputedStyle(second as Element).marginTop).toBe(step);
  });

  it("stacks consecutive rows vertically, each on its own line", () => {
    const { container } = renderThemed(
      <FieldSet legend="Terms">
        <Checkbox label="Agree" />
        <Checkbox label="Subscribe" />
      </FieldSet>,
    );

    const rows = [...container.querySelectorAll(".vpg-checkbox-row")] as HTMLElement[];
    const [first, second] = rows.map((row) => row.getBoundingClientRect()) as [DOMRect, DOMRect];

    // Every other field in a fieldset takes its own line; a row that shared one would leave the
    // sibling margin separating nothing.
    expect(second.top).toBeGreaterThanOrEqual(first.bottom);
  });

  it("keeps a row's clickable area to its own content rather than the fieldset's width", () => {
    const { container } = renderThemed(
      <FieldSet legend="Terms">
        <Checkbox label="Agree" />
      </FieldSet>,
    );

    const row = container.querySelector(".vpg-checkbox-row") as HTMLElement;
    const fieldSet = container.querySelector(".vpg-fieldset") as HTMLElement;

    expect(row.getBoundingClientRect().width).toBeLessThan(fieldSet.getBoundingClientRect().width / 2);
  });
});

/**
 * Drives Chromium's own media emulation over CDP, which is what makes `(prefers-color-scheme:
 * dark)` match for real. Passing no feature clears the override and returns the page to the host's
 * preference.
 */
async function emulateColorScheme(value: "light" | "dark" | null) {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: value === null ? [] : [{ name: "prefers-color-scheme", value }],
  });
}

afterEach(async () => {
  await emulateColorScheme(null);
});

describe("Checkbox colours across colour modes", () => {
  it("fills a checked box with a different accent under an OS dark preference", async () => {
    await emulateColorScheme("light");
    const light = getComputedStyle(renderBox({ defaultChecked: true })).backgroundColor;
    cleanup();

    await emulateColorScheme("dark");
    const dark = getComputedStyle(renderBox({ defaultChecked: true })).backgroundColor;

    expect(dark).not.toBe(light);
  });

  it("keeps the indeterminate bar contrasting with the box it sits in in either mode", async () => {
    for (const mode of ["light", "dark"] as const) {
      await emulateColorScheme(mode);
      const box = renderBox({ indeterminate: true });

      expect(glyphOf(box).backgroundColor, mode).not.toBe(getComputedStyle(box).backgroundColor);
      cleanup();
    }
  });
});
