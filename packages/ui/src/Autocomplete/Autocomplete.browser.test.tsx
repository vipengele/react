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

/** Renders `ui` into a block container of a fixed width, under a real `ThemeProvider`. `inset`
 * moves the container off the viewport's left edge, where the listbox keeps a gap of its own. */
function renderInto(width: number, ui: ReactNode, inset = 0) {
  const { container } = render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${width}px`, marginLeft: `${inset}px` }}>
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

    it("keeps the listbox open and its highlight in place when the chevron is pressed", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>);

      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      await userEvent.keyboard("an");
      const highlighted = input.getAttribute("aria-activedescendant");
      expect(highlighted).not.toBeNull();

      await userEvent.click(chevronOf(container));

      expect(input).toHaveAttribute("aria-expanded", "true");
      expect(input).toHaveAttribute("aria-activedescendant", highlighted as string);
      await userEvent.keyboard("{Enter}");
      expect(input).toHaveValue("Banana");
    });
  });

  // Every edge below is a border box read off `getBoundingClientRect()`: the listbox's outer
  // border against the field's outer border, which is what the eye lines up — never the position
  // of either element's text.
  describe("the open listbox", () => {
    /** Gap between the field and its listbox, in pixels. */
    const LISTBOX_OFFSET = 4;

    /** Further from the viewport's left edge than the gap the listbox keeps from it, so the
     * listbox is never shifted off the field's edge to keep that gap. */
    const INSET = 40;

    it("matches the field's width and left edge beside a row of chips", async () => {
      const { container } = renderInto(
        300,
        <Autocomplete multiple aria-label="Fruit" defaultValue={["apple", "banana", "cherry", "damson"]}>
          {fruitOptions}
        </Autocomplete>,
        INSET,
      );

      await userEvent.click(screen.getByRole("combobox"));

      const field = fieldOf(container);
      const listbox = screen.getByRole("listbox");
      await expect.poll(() => listbox.getBoundingClientRect().left).toBeCloseTo(field.getBoundingClientRect().left, 0);
      expect(listbox.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
    });

    it("aligns its left edge with the field's, not the input's inset one", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>, INSET);

      await userEvent.click(screen.getByRole("combobox"));

      const field = fieldOf(container);
      const listbox = screen.getByRole("listbox");
      await expect.poll(() => listbox.getBoundingClientRect().left).toBeCloseTo(field.getBoundingClientRect().left, 0);
    });

    it("stays anchored below the field as its chips wrap onto another line", async () => {
      const { container } = renderInto(
        240,
        <Autocomplete multiple aria-label="Fruit" defaultValue={["apple"]}>
          {fruitOptions}
        </Autocomplete>,
        INSET,
      );

      await userEvent.click(screen.getByRole("combobox"));
      const field = fieldOf(container);
      const startHeight = field.getBoundingClientRect().height;
      for (const fruit of fruits.slice(1)) {
        await userEvent.click(screen.getByRole("option", { name: fruit }));
      }

      const listbox = screen.getByRole("listbox");
      expect(field.getBoundingClientRect().height).toBeGreaterThan(startHeight);
      await expect.poll(() => listbox.getBoundingClientRect().top).toBeCloseTo(field.getBoundingClientRect().bottom + LISTBOX_OFFSET, 0);
      expect(listbox.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
    });

    it("keeps focus, the query and the open listbox when the field's padding is pressed", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>, INSET);

      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      await userEvent.keyboard("an");

      await userEvent.click(fieldOf(container), { position: { x: 4, y: 16 } });

      expect(document.activeElement).toBe(input);
      expect(input).toHaveAttribute("aria-expanded", "true");
      expect(input).toHaveValue("an");
      await userEvent.keyboard("{Enter}");
      expect(input).toHaveValue("Banana");
    });

    it("focuses the input and opens the listbox when the closed field's padding is pressed", async () => {
      const { container } = renderInto(300, <Autocomplete aria-label="Fruit">{fruitOptions}</Autocomplete>, INSET);

      await userEvent.click(fieldOf(container), { position: { x: 4, y: 16 } });

      const input = screen.getByRole("combobox");
      expect(document.activeElement).toBe(input);
      expect(input).toHaveAttribute("aria-expanded", "true");
    });

    it("keeps focus, the query and the open listbox while a chip is removed", async () => {
      renderInto(
        300,
        <Autocomplete multiple aria-label="Fruit" defaultValue={["apple", "banana"]}>
          {fruitOptions}
        </Autocomplete>,
        INSET,
      );

      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      await userEvent.keyboard("ch");
      await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(screen.queryByRole("button", { name: "Remove Apple" })).toBeNull();
      expect(document.activeElement).toBe(input);
      expect(input).toHaveAttribute("aria-expanded", "true");
      expect(input).toHaveValue("ch");
    });

    it("leaves a closed listbox closed when a chip is removed", async () => {
      renderInto(
        300,
        <Autocomplete multiple aria-label="Fruit" defaultValue={["apple", "banana"]}>
          {fruitOptions}
        </Autocomplete>,
        INSET,
      );

      await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(screen.queryByRole("button", { name: "Remove Apple" })).toBeNull();
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
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
