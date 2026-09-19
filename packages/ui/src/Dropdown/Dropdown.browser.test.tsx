import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactNode, useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { useListboxKeyboard } from "../internal/useListboxKeyboard.js";
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

  it("marks the field whose listbox a pointer opened with the accent border and no ring", async () => {
    const { container } = renderInto(
      300,
      <Dropdown aria-label="Size" defaultValue="small">
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    await userEvent.click(screen.getByRole("combobox"));

    const field = fieldOf(container);
    for (const animation of field.getAnimations()) {
      animation.finish();
    }
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
    // A pointer press does not match `:focus-visible` on a non-text control, so any accent here
    // comes from the open listbox and not from keyboard focus.
    expect(field.matches(".tandiko-field-shell:has(> :focus-visible)")).toBe(false);
    expect(getComputedStyle(field).borderTopColor).toBe(resolvedColour("--tandiko-accent"));
    expect(getComputedStyle(field).boxShadow).toBe("none");
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
        <Dropdown multiple aria-label="Fruit" defaultValue={["apple", "banana", "cherry", "damson"]}>
          {fruitOptions}
        </Dropdown>,
        INSET,
      );

      await userEvent.click(screen.getByRole("combobox"));

      const field = fieldOf(container);
      const listbox = screen.getByRole("listbox");
      await expect.poll(() => listbox.getBoundingClientRect().left).toBeCloseTo(field.getBoundingClientRect().left, 0);
      expect(listbox.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
    });

    it("aligns its left edge with the field's, not the trigger's inset one", async () => {
      const { container } = renderInto(
        300,
        <Dropdown aria-label="Size" defaultValue="small">
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>,
        INSET,
      );

      await userEvent.click(screen.getByRole("combobox"));

      const field = fieldOf(container);
      const listbox = screen.getByRole("listbox");
      await expect.poll(() => listbox.getBoundingClientRect().left).toBeCloseTo(field.getBoundingClientRect().left, 0);
    });

    it("stays anchored below the field as its chips wrap onto another line", async () => {
      const { container } = renderInto(
        240,
        <Dropdown multiple aria-label="Fruit" defaultValue={["apple"]}>
          {fruitOptions}
        </Dropdown>,
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

    it("keeps the listbox open while a chip is removed from the field", async () => {
      renderInto(
        300,
        <Dropdown multiple aria-label="Fruit" defaultValue={["apple", "banana"]}>
          {fruitOptions}
        </Dropdown>,
        INSET,
      );

      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(screen.queryByRole("button", { name: "Remove Apple" })).toBeNull();
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute("aria-selected", "false");
    });

    it("leaves a closed listbox closed when a chip is removed", async () => {
      renderInto(
        300,
        <Dropdown multiple aria-label="Fruit" defaultValue={["apple", "banana"]}>
          {fruitOptions}
        </Dropdown>,
        INSET,
      );

      await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(screen.queryByRole("button", { name: "Remove Apple" })).toBeNull();
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    });

    it("keeps focus and a working keyboard on the trigger when the field's padding is pressed", async () => {
      const { container } = renderInto(300, <Dropdown aria-label="Fruit">{fruitOptions}</Dropdown>, INSET);

      const trigger = screen.getByRole("combobox");
      await userEvent.click(trigger);
      await userEvent.keyboard("{ArrowDown}");
      const highlighted = trigger.getAttribute("aria-activedescendant");
      expect(highlighted).not.toBeNull();

      await userEvent.click(fieldOf(container), { position: { x: 4, y: 16 } });

      expect(document.activeElement).toBe(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      await userEvent.keyboard("{ArrowDown}");
      expect(trigger.getAttribute("aria-activedescendant")).not.toBe(highlighted);
      expect(trigger.getAttribute("aria-activedescendant")).not.toBeNull();
    });

    it("keeps focus on the trigger while a chip is removed from the field", async () => {
      renderInto(
        300,
        <Dropdown multiple aria-label="Fruit" defaultValue={["apple", "banana"]}>
          {fruitOptions}
        </Dropdown>,
        INSET,
      );

      const trigger = screen.getByRole("combobox");
      await userEvent.click(trigger);
      await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(screen.queryByRole("button", { name: "Remove Apple" })).toBeNull();
      expect(document.activeElement).toBe(trigger);
      await userEvent.keyboard("{ArrowDown}");
      expect(trigger.getAttribute("aria-activedescendant")).not.toBeNull();
    });

    it("focuses the trigger and opens the listbox when the closed field's padding is pressed", async () => {
      const { container } = renderInto(300, <Dropdown aria-label="Fruit">{fruitOptions}</Dropdown>, INSET);

      await userEvent.click(fieldOf(container), { position: { x: 4, y: 16 } });

      const trigger = screen.getByRole("combobox");
      expect(document.activeElement).toBe(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("closes when pressed outside the field", async () => {
      renderInto(
        300,
        <Dropdown aria-label="Size">
          <Dropdown.Option value="small" label="Small" />
        </Dropdown>,
        INSET,
      );

      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(document.body, { position: { x: 5, y: 500 } });

      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("selection encoding", () => {
    it("marks the selected single-select option with a 16px trailing check", async () => {
      renderInto(
        300,
        <Dropdown aria-label="Size" defaultValue="small">
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>,
      );

      await userEvent.click(screen.getByRole("combobox"));

      const selected = screen.getByRole("option", { name: "Small" });
      const unselected = screen.getByRole("option", { name: "Large" });
      const check = selected.querySelector(".tandiko-listbox-option-check") as SVGElement;
      expect(check).not.toBeNull();
      expect(check.getBoundingClientRect().width).toBeCloseTo(16, 0);
      expect(check.getBoundingClientRect().height).toBeCloseTo(16, 0);
      expect(unselected.querySelector(".tandiko-listbox-option-check")).toBeNull();
    });

    it("colours a selected option's text the same as an unselected one", async () => {
      renderInto(
        300,
        <Dropdown aria-label="Size" defaultValue="small">
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>,
      );

      await userEvent.click(screen.getByRole("combobox"));

      const selectedLabel = screen.getByRole("option", { name: "Small" }).querySelector(".tandiko-listbox-option-label") as HTMLElement;
      const unselectedLabel = screen.getByRole("option", { name: "Large" }).querySelector(".tandiko-listbox-option-label") as HTMLElement;
      expect(getComputedStyle(selectedLabel).color).toBe(getComputedStyle(unselectedLabel).color);
    });

    it("gives a selected multi-select option no trailing check", async () => {
      renderInto(
        300,
        <Dropdown multiple aria-label="Fruit" defaultValue={["apple"]}>
          {fruitOptions}
        </Dropdown>,
      );

      await userEvent.click(screen.getByRole("combobox"));

      const selected = screen.getByRole("option", { name: "Apple" });
      expect(selected.querySelector(".tandiko-listbox-option-check")).toBeNull();
    });
  });

  describe("a listbox with no field attached", () => {
    /** The hook with only a reference and a floating element: `fieldRef` is never attached. */
    function Unfielded() {
      const [open, setOpen] = useState(false);
      const listRef = useRef<Array<HTMLElement | null>>([]);
      const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useListboxKeyboard({
        listRef,
        activeIndex: null,
        onNavigate: () => {},
        disabledIndices: [],
        typeahead: false,
        role: "select",
        open,
        onOpenChange: setOpen,
      });
      return (
        <>
          <div ref={refs.setReference} {...getReferenceProps()}>
            Fruit
          </div>
          {open ? (
            <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
              Apple
            </div>
          ) : null}
        </>
      );
    }

    it("closes on a press outside its reference and floating elements", async () => {
      renderInto(300, <Unfielded />);

      const reference = screen.getByRole("combobox");
      await userEvent.click(reference);
      expect(reference).toHaveAttribute("aria-expanded", "true");

      await userEvent.click(document.body, { position: { x: 5, y: 500 } });

      expect(reference).toHaveAttribute("aria-expanded", "false");
    });
  });
});
