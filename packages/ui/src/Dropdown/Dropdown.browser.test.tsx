import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Dropdown } from "./Dropdown.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(async () => {
  await userEvent.unhover(document.body);
  cleanup();
});

/** The size scale's default control step at the default seed. */
const CONTROL_STEP = 32;

/** `min-width: 12rem` on the field, at the default 16px root font size. */
const FLOOR = 192;

const fruits = ["Apple", "Banana", "Cherry", "Damson", "Elderberry", "Fig", "Grape", "Honeydew"];

const fruitOptions = fruits.map((fruit) => <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />);

/** Renders `ui` into a block container of a fixed width, under a real `ThemeProvider`. */
function renderInto(width: number, ui: ReactNode) {
  const { container } = render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${width}px` }}>
        {ui}
      </div>
    </ThemeProvider>,
  );
  return { container, box: screen.getByTestId("container") };
}

/** The bordered box: the element whose border and fill the user reads as the field. */
function fieldOf(container: HTMLElement): HTMLElement {
  const field = container.querySelector(".tandiko-dropdown-control");
  expect(field).not.toBeNull();
  return field as HTMLElement;
}

/** The colour a `--tandiko-*` role token resolves to, read by consuming it as a real property —
 * a custom property read back off `getPropertyValue` is its unresolved token stream. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".tandiko-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

describe("Dropdown under a real ThemeProvider", () => {
  it("shows the field's surface behind a hovered trigger", async () => {
    renderInto(
      300,
      <Dropdown aria-label="Size" defaultValue="small">
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    const trigger = screen.getByRole("combobox");
    await userEvent.hover(trigger);

    // A fill of the trigger's own draws a second, smaller box inside the field's border. The
    // trigger is transparent, so what shows through it is the field's own surface and hover.
    expect(getComputedStyle(trigger).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("keeps a multi-select within a container narrower than its floor", () => {
    const { container, box } = renderInto(
      150,
      <Dropdown multiple aria-label="Fruit" defaultValue={fruits.map((fruit) => fruit.toLowerCase())}>
        {fruitOptions}
      </Dropdown>,
    );

    expect(fieldOf(container).getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
  });

  it("keeps a chip wider than its container inside the field's border", () => {
    const { container, box } = renderInto(
      240,
      <Dropdown multiple aria-label="Word" defaultValue={["long"]}>
        <Dropdown.Option value="long" label="Pneumonoultramicroscopicsilicovolcanoconiosis" />
      </Dropdown>,
    );

    const field = fieldOf(container);
    const chip = container.querySelector(".tandiko-listbox-chip") as HTMLElement;
    expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
    expect(chip.getBoundingClientRect().right).toBeLessThanOrEqual(field.getBoundingClientRect().right);
  });

  it("wraps its chips onto further lines rather than widening the field", () => {
    const { container, box } = renderInto(
      240,
      <Dropdown multiple aria-label="Fruit" defaultValue={fruits.map((fruit) => fruit.toLowerCase())}>
        {fruitOptions}
      </Dropdown>,
    );

    const chipTops = new Set(
      Array.from(container.querySelectorAll(".tandiko-listbox-chip"), (chip) => Math.round(chip.getBoundingClientRect().top)),
    );
    expect(fieldOf(container).getBoundingClientRect().width).toBeCloseTo(box.getBoundingClientRect().width, 0);
    expect(chipTops.size).toBeGreaterThan(1);
  });

  it("keeps its floor in a container wider than it", () => {
    const { container } = renderInto(
      400,
      <Dropdown aria-label="Size" defaultValue="a">
        <Dropdown.Option value="a" label="A" />
      </Dropdown>,
    );

    expect(fieldOf(container).getBoundingClientRect().width).toBeCloseTo(FLOOR, 0);
  });

  it("stands a single-select field at the size scale's control step", () => {
    const { container } = renderInto(
      300,
      <Dropdown aria-label="Size" defaultValue="small">
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    expect(fieldOf(container).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
  });

  it("fills the field's height with the trigger", () => {
    const { container } = renderInto(
      300,
      <Dropdown aria-label="Size" defaultValue="small">
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    // A trigger shorter than the field leaves a strip along its top and bottom where a click
    // lands on the field and opens nothing.
    expect(screen.getByRole("combobox").getBoundingClientRect().height).toBeCloseTo(fieldOf(container).clientHeight, 0);
  });

  it("keeps the trigger a control-step-wide target beside a field full of chips", () => {
    renderInto(
      240,
      <Dropdown multiple aria-label="Fruit" defaultValue={fruits.map((fruit) => fruit.toLowerCase())}>
        {fruitOptions}
      </Dropdown>,
    );

    expect(screen.getByRole("combobox").getBoundingClientRect().width).toBeGreaterThanOrEqual(CONTROL_STEP - 0.5);
  });

  it("sets the chevron against the field's trailing edge", () => {
    const { container } = renderInto(
      300,
      <Dropdown aria-label="Size" placeholder="Pick">
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    const field = fieldOf(container);
    const chevron = container.querySelector(".tandiko-dropdown-chevron") as SVGElement;
    expect(chevron).not.toBeNull();
    const contentRight = field.getBoundingClientRect().right - field.clientLeft - Number.parseFloat(getComputedStyle(field).paddingRight);
    expect(chevron.getBoundingClientRect().right).toBeCloseTo(contentRight, 0);
  });

  it("draws the field's focus ring when the trigger takes keyboard focus", async () => {
    const { container } = renderInto(
      300,
      <Dropdown aria-label="Size" defaultValue="small">
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    await userEvent.tab();

    const field = fieldOf(container);
    // The shell transitions into its focused state; reading mid-transition sees a blend of the
    // resting and focused border.
    for (const animation of field.getAnimations()) {
      animation.finish();
    }
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
    expect(field.matches(".tandiko-field-shell:has(> :focus-visible)")).toBe(true);
    expect(getComputedStyle(field).borderTopColor).toBe(resolvedColour("--tandiko-accent"));
    expect(getComputedStyle(field).boxShadow).not.toBe("none");
  });

  it("draws the field's danger border when the trigger is invalid", () => {
    const { container } = renderInto(
      300,
      <Dropdown aria-label="Size" aria-invalid>
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    const field = fieldOf(container);
    // biome-ignore lint/security/noSecrets: a CSS selector, not a credential
    expect(field.matches('.tandiko-field-shell:has(> [aria-invalid="true"])')).toBe(true);
    expect(getComputedStyle(field).borderTopColor).toBe(resolvedColour("--tandiko-danger"));
  });
});
