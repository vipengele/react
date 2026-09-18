import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Autocomplete } from "./Autocomplete.js";

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

const fruitOptions = fruits.map((fruit) => <Autocomplete.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />);

const fruitValues = fruits.map((fruit) => fruit.toLowerCase());

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
  const field = container.querySelector(".tandiko-autocomplete-control");
  expect(field).not.toBeNull();
  return field as HTMLElement;
}

function chevronOf(container: HTMLElement): HTMLElement {
  const chevron = container.querySelector(".tandiko-autocomplete-chevron");
  expect(chevron).not.toBeNull();
  return chevron as HTMLElement;
}

/** Settles the shell's state transitions; reading mid-transition sees a blend of two states. */
function finishTransitions(element: HTMLElement) {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
}

/** Reads a `--tandiko-*` token by consuming it as a real property on a probe inside the themed
 * root — a custom property read back off `getPropertyValue` is its unresolved token stream. */
function resolved(token: string, property: "color" | "backgroundColor" | "borderTopLeftRadius" | "paddingTop"): string {
  const probe = document.createElement("span");
  probe.style[property] = `var(${token})`;
  (document.querySelector(".tandiko-root") as HTMLElement).append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

describe("Autocomplete under a real ThemeProvider", () => {
  describe("the field", () => {
    it("stands a single-select field at the size scale's control step", () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      expect(fieldOf(container).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
    });

    it("rounds the field at the radius ladder's inner step", () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      expect(getComputedStyle(fieldOf(container)).borderTopLeftRadius).toBe(resolved("--tandiko-radius-sm", "borderTopLeftRadius"));
    });

    it("fills the whole field with the hover surface while hovered", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      const field = fieldOf(container);
      await userEvent.hover(screen.getByRole("combobox"));
      finishTransitions(field);

      expect(getComputedStyle(field).backgroundColor).toBe(resolved("--tandiko-surface-hover", "backgroundColor"));
      // A fill of the input's own draws a second, smaller box inside the field's border. The
      // input is transparent, so what shows through it is the field's own hover surface.
      expect(getComputedStyle(screen.getByRole("combobox")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    it("fills the field's height with the input", () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      // An input shorter than the field leaves a strip along its top and bottom where a click
      // lands on the field and focuses nothing.
      expect(screen.getByRole("combobox").getBoundingClientRect().height).toBeCloseTo(fieldOf(container).clientHeight, 0);
    });

    it("keeps its floor in a container wider than it", () => {
      const { container } = renderInto(400, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      expect(fieldOf(container).getBoundingClientRect().width).toBeCloseTo(FLOOR, 0);
    });
  });

  describe("containment", () => {
    it("keeps a field within a container narrower than its floor", () => {
      const { container, box } = renderInto(150, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      expect(fieldOf(container).getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
    });

    it("keeps a multi-select within a container narrower than its floor", () => {
      const { container, box } = renderInto(
        150,
        <Autocomplete multiple aria-label="Fruit" defaultValue={fruitValues}>
          {fruitOptions}
        </Autocomplete>,
      );

      expect(fieldOf(container).getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
    });

    it("keeps a chip wider than its container inside the field's border", () => {
      const { container, box } = renderInto(
        240,
        <Autocomplete multiple aria-label="Word" defaultValue={["long"]}>
          <Autocomplete.Option value="long" label="Pneumonoultramicroscopicsilicovolcanoconiosis" />
        </Autocomplete>,
      );

      const field = fieldOf(container);
      const chip = container.querySelector(".tandiko-listbox-chip") as HTMLElement;
      expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
      expect(chip.getBoundingClientRect().right).toBeLessThanOrEqual(field.getBoundingClientRect().right);
    });

    it("wraps its chips onto further lines rather than widening the field", () => {
      const { container, box } = renderInto(
        240,
        <Autocomplete multiple aria-label="Fruit" defaultValue={fruitValues}>
          {fruitOptions}
        </Autocomplete>,
      );

      const chipTops = new Set(
        Array.from(container.querySelectorAll(".tandiko-listbox-chip"), (chip) => Math.round(chip.getBoundingClientRect().top)),
      );
      expect(fieldOf(container).getBoundingClientRect().width).toBeCloseTo(box.getBoundingClientRect().width, 0);
      expect(chipTops.size).toBeGreaterThan(1);
    });

    it("keeps the input a control-step-wide target beside a field full of chips", () => {
      renderInto(
        240,
        <Autocomplete multiple aria-label="Fruit" defaultValue={fruitValues}>
          {fruitOptions}
        </Autocomplete>,
      );

      expect(screen.getByRole("combobox").getBoundingClientRect().width).toBeGreaterThanOrEqual(CONTROL_STEP - 0.5);
    });
  });

  describe("the chevron", () => {
    it("sets the chevron against the field's trailing edge", () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      const field = fieldOf(container);
      const chevron = chevronOf(container);
      const contentRight = field.getBoundingClientRect().right - field.clientLeft - Number.parseFloat(getComputedStyle(field).paddingRight);
      expect(chevron.getBoundingClientRect().right).toBeCloseTo(contentRight, 0);
    });

    it("opens the listbox and focuses the input when the chevron is clicked", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      await userEvent.click(chevronOf(container));

      expect(document.activeElement).toBe(screen.getByRole("combobox"));
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
      expect(screen.getAllByRole("option")).toHaveLength(fruits.length);
    });

    it("keeps the typed query and the open listbox when the chevron is clicked mid-search", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      await userEvent.keyboard("an");
      await userEvent.click(chevronOf(container));

      // A blur reverts unmatched text, so a click that took focus off the input would clear the
      // query the user was typing.
      expect(document.activeElement).toBe(input);
      expect(input).toHaveValue("an");
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Banana"]);
    });
  });

  describe("state", () => {
    it("draws the field's focus ring when the input takes focus", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      await userEvent.tab();

      const field = fieldOf(container);
      finishTransitions(field);
      expect(document.activeElement).toBe(screen.getByRole("combobox"));
      expect(field.matches(".tandiko-field-shell:has(> :focus-visible)")).toBe(true);
      expect(getComputedStyle(field).borderTopColor).toBe(resolved("--tandiko-accent", "color"));
      expect(getComputedStyle(field).boxShadow).not.toBe("none");
    });

    it("draws the field's danger border when the input is invalid", () => {
      const { container } = renderInto(
        300,
        <Autocomplete aria-label="Fruit" aria-invalid>
          {fruitOptions}
        </Autocomplete>,
      );

      const field = fieldOf(container);
      // biome-ignore lint/security/noSecrets: a CSS selector, not a credential
      expect(field.matches('.tandiko-field-shell:has(> [aria-invalid="true"])')).toBe(true);
      expect(getComputedStyle(field).borderTopColor).toBe(resolved("--tandiko-danger", "color"));
    });
  });

  it("pads the no-results message by the spacing scale's step, the same as an option's block padding", async () => {
    renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.keyboard("xyz");

    const empty = screen.getByText("No results");
    const step = resolved("--tandiko-space-2", "paddingTop");
    expect(getComputedStyle(empty).paddingTop).toBe(step);
    expect(getComputedStyle(empty).paddingLeft).toBe(step);
  });
});
