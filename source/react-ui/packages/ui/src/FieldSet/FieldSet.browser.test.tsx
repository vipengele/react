import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { FieldSet } from "./FieldSet.js";

/**
 * A fieldset's layout is the browser's own: the legend straddles the border, and the space above
 * the first child is `max(padding-top, legend-block-size)`. jsdom lays none of that out and
 * resolves no `--vpg-*` read, so every assertion here needs a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous one
// and queries start matching more than one fieldset.
afterEach(cleanup);

/** Mounts `children` under a real provider, so every `--vpg-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

/** Resolves a length token to the pixels the engine computes for it inside the mounted root. */
function resolvedLength(token: string): number {
  const probe = document.createElement("div");
  probe.style.blockSize = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const pixels = Number.parseFloat(getComputedStyle(probe).blockSize);
  probe.remove();
  return pixels;
}

describe("FieldSet under a real ThemeProvider", () => {
  it("stacks inline children one per line", () => {
    renderThemed(
      <FieldSet legend="Terms">
        <span>Agree</span>
        <span>Subscribe</span>
      </FieldSet>,
    );

    // An inline child is laid out by the fieldset, not by itself: two of them share a line unless
    // the fieldset owns the stacking, and the space meant to separate them separates nothing.
    const first = screen.getByText("Agree").getBoundingClientRect();
    const second = screen.getByText("Subscribe").getBoundingClientRect();

    expect(second.top).toBeGreaterThanOrEqual(first.bottom);
  });

  it("separates consecutive inline children by the space step", () => {
    renderThemed(
      <FieldSet legend="Terms">
        <span>Agree</span>
        <span>Subscribe</span>
      </FieldSet>,
    );

    const first = screen.getByText("Agree").getBoundingClientRect();
    const second = screen.getByText("Subscribe").getBoundingClientRect();

    expect(second.top - first.bottom).toBeCloseTo(resolvedLength("--vpg-space-5"), 1);
  });

  it("separates consecutive block children by the same space step", () => {
    renderThemed(
      <FieldSet legend="Shipping address">
        <FormField label="Street">
          <input />
        </FormField>
        <FormField label="City">
          <input />
        </FormField>
      </FieldSet>,
    );

    const first = screen.getByText("Street").closest(".vpg-form-field") as HTMLElement;
    const second = screen.getByText("City").closest(".vpg-form-field") as HTMLElement;

    const gap = second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
    expect(gap).toBeCloseTo(resolvedLength("--vpg-space-5"), 1);
  });

  it("stretches a child that sizes itself to its container across the fieldset's width", () => {
    renderThemed(
      <FieldSet legend="Shipping address">
        <FormField label="Street">
          <input />
        </FormField>
      </FieldSet>,
    );

    const fieldSet = screen.getByRole("group", { name: "Shipping address" });
    const field = screen.getByText("Street").closest(".vpg-form-field") as HTMLElement;

    // `clientWidth` is the padding box, so only the padding has to come off — a bounding rect
    // would still carry the fieldset's border.
    const available = fieldSet.clientWidth - 2 * resolvedLength("--vpg-space-5");
    expect(field.getBoundingClientRect().width).toBeCloseTo(available, 1);
  });

  it("leaves the space above the first child to the browser's own legend handling", () => {
    const { container } = renderThemed(
      <>
        <FieldSet legend="Terms">
          <span>Agree</span>
        </FieldSet>
        <fieldset className="vpg-fieldset">
          <legend className="vpg-fieldset-legend">Terms</legend>
          <span>Reference</span>
        </fieldset>
      </>,
    );

    // A bare fieldset carrying the same classes and the same legend is what the browser gives:
    // `max(padding-top, legend-block-size)` above the first child. Anything the component adds of
    // its own — a margin on a wrapper, the legend counted as a flex item — shows up as a larger
    // offset than this reference.
    const [themed, reference] = [...container.querySelectorAll("fieldset")] as [HTMLFieldSetElement, HTMLFieldSetElement];
    const offsetOf = (fieldSet: HTMLElement) => {
      const child = fieldSet.querySelector("span") as HTMLElement;
      return child.getBoundingClientRect().top - fieldSet.getBoundingClientRect().top;
    };

    expect(offsetOf(themed)).toBeCloseTo(offsetOf(reference), 1);
  });
});
