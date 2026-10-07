import { ThemeProvider } from "@vipengele/react-tokens";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { Accordion } from "../Accordion/Accordion.js";
import { Disclosure } from "./Disclosure.js";

/**
 * Drives Chromium's own media emulation over CDP, so `(prefers-reduced-motion: reduce)` matches
 * for real. Passing `null` clears the override and returns the page to the host's preference.
 */
async function emulateReducedMotion(value: "reduce" | "no-preference" | null) {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: value === null ? [] : [{ name: "prefers-reduced-motion", value }],
  });
}

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its tree mounted.
afterEach(async () => {
  cleanup();
  await emulateReducedMotion(null);
});

function renderThemed(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function trigger(name = "Details"): HTMLElement {
  return screen.getByRole("button", { name });
}

/** A closed panel is `hidden` and so absent from the accessibility tree, so it is found through
 * the trigger's `aria-controls` rather than by role. */
function panel(name = "Details"): HTMLElement {
  return document.getElementById(trigger(name).getAttribute("aria-controls") as string) as HTMLElement;
}

function heightOf(element: Element): number {
  return element.getBoundingClientRect().height;
}

/** Content tall enough that the difference between 0, a mid-transition height and the final
 * height is many pixels wide. */
function TallContent() {
  return <div style={{ height: 200 }}>Body</div>;
}

/**
 * Pauses every transition running on the panel and seeks each to half its active duration, so the
 * height read next is the one the engine paints at that instant — independent of how long the
 * test itself took to get here. The `height` and `content-visibility` transitions move together:
 * a `content-visibility` left at its start still reads `hidden` on an opening panel, and size
 * containment then collapses its `auto` height to 0. Reading `getAnimations()` flushes style, so
 * the transitions a just-committed attribute change starts are already in the list. Returns the
 * transitions, and the `height` one's duration.
 */
function seekToHalfway(element: Element): { transitions: Animation[]; duration: number } {
  const transitions = element.getAnimations();
  const height = transitions.find(
    (animation): animation is CSSTransition => animation instanceof CSSTransition && animation.transitionProperty === "height",
  );
  if (height === undefined) {
    throw new Error("the panel is running no height transition");
  }
  const duration = Number(height.effect?.getComputedTiming().duration);
  for (const transition of transitions) {
    transition.pause();
    transition.currentTime = duration / 2;
  }
  return { transitions, duration };
}

function finishAnimations(element: Element) {
  for (const animation of element.getAnimations({ subtree: true })) {
    animation.finish();
  }
}

/** The colour a `--vpg-*` role token resolves to, read by consuming it as a real property —
 * a custom property read back off `getPropertyValue` is its unresolved token stream. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

describe("Disclosure in a real engine", () => {
  it("lays a closed panel out 0px tall", () => {
    renderThemed(
      <Disclosure label="Details">
        <TallContent />
      </Disclosure>,
    );

    expect(panel().getAttribute("hidden")).toBe("until-found");
    expect(heightOf(panel())).toBe(0);
  });

  it("grows the panel through intermediate heights while opening", async () => {
    await emulateReducedMotion("no-preference");
    renderThemed(
      <Disclosure label="Details">
        <TallContent />
      </Disclosure>,
    );

    await userEvent.click(trigger());
    const { transitions, duration } = seekToHalfway(panel());
    expect(duration).toBeGreaterThan(0);
    const halfway = heightOf(panel());

    for (const transition of transitions) {
      transition.finish();
    }
    const final = heightOf(panel());

    expect(final).toBeGreaterThan(0);
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(final);
  });

  it("keeps the content painted through intermediate heights while closing", async () => {
    await emulateReducedMotion("no-preference");
    renderThemed(
      <Disclosure label="Details" defaultOpen>
        <TallContent />
      </Disclosure>,
    );
    const start = heightOf(panel());
    expect(start).toBeGreaterThan(0);

    await userEvent.click(trigger());
    const { transitions, duration } = seekToHalfway(panel());
    expect(duration).toBeGreaterThan(0);
    const halfway = heightOf(panel());

    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(start);
    // `content-visibility` flips to `hidden` only at the end of a closing, so the content still
    // paints at the halfway point.
    expect(getComputedStyle(panel()).contentVisibility).toBe("visible");
    const content = panel().querySelector(".vpg-disclosure-content") as HTMLElement;
    expect(heightOf(content)).toBeGreaterThan(0);

    for (const transition of transitions) {
      transition.finish();
    }
    expect(heightOf(panel())).toBe(0);
  });

  it("reaches the open height at once under prefers-reduced-motion: reduce", async () => {
    await emulateReducedMotion("reduce");
    renderThemed(
      <>
        <Disclosure label="Reference" defaultOpen>
          <TallContent />
        </Disclosure>
        <Disclosure label="Details">
          <TallContent />
        </Disclosure>
      </>,
    );
    const target = heightOf(panel("Reference"));
    expect(target).toBeGreaterThan(0);

    await userEvent.click(trigger());
    // A frame is long enough for a collapsed duration to elapse, and far shorter than the
    // full-motion one, so the panel cannot reach its open height here by running at full speed.
    await vi.waitFor(
      () => {
        expect(heightOf(panel())).toBe(target);
      },
      { timeout: 100, interval: 16 },
    );
  });

  it("opens a closed uncontrolled panel when the browser fires beforematch at it", async () => {
    renderThemed(
      <Disclosure label="Details">
        <TallContent />
      </Disclosure>,
    );
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    act(() => {
      panel().dispatchEvent(new Event("beforematch"));
    });
    finishAnimations(panel());

    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(panel().hasAttribute("hidden")).toBe(false);
    expect(heightOf(panel())).toBeGreaterThan(0);
  });

  it("turns the chevron when the disclosure opens", async () => {
    renderThemed(<Disclosure label="Details">Body</Disclosure>);
    const chevron = document.querySelector(".vpg-disclosure-chevron") as SVGElement;
    const closed = getComputedStyle(chevron).transform;

    await userEvent.click(trigger());
    finishAnimations(document.querySelector(".vpg-disclosure") as HTMLElement);

    expect(getComputedStyle(chevron).transform).not.toBe(closed);
  });

  it("colours the trigger with the theme's ink", () => {
    renderThemed(<Disclosure label="Details">Body</Disclosure>);

    const ink = resolvedColour("--vpg-ink");
    expect(ink).not.toBe("");
    expect(getComputedStyle(trigger()).color).toBe(ink);
  });

  it("holds several panels open at once in a multiple accordion", () => {
    renderThemed(
      <Accordion multiple defaultValue={new Set(["a", "b"])}>
        <Disclosure value="a" label="First">
          <TallContent />
        </Disclosure>
        <Disclosure value="b" label="Second">
          <TallContent />
        </Disclosure>
        <Disclosure value="c" label="Third">
          <TallContent />
        </Disclosure>
      </Accordion>,
    );

    expect(heightOf(panel("First"))).toBeGreaterThan(0);
    expect(heightOf(panel("Second"))).toBeGreaterThan(0);
    expect(heightOf(panel("Third"))).toBe(0);
  });
});
