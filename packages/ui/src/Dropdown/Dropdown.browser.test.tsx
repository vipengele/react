import { ThemeProvider } from "@tandiko/tokens";
import { Plus } from "@tandiko/icons";
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

const fruits = ["Apple", "Banana", "Cherry", "Damson", "Elderberry", "Fig", "Grape", "Honeydew"];

const fruitOptions = fruits.map((fruit) => <Dropdown.Option key={fruit} value={fruit.toLowerCase()} label={fruit} />);

/** A fruit as the value object `Dropdown` takes and reports for its option. */
function fruitValue(fruit: string) {
  return { value: fruit.toLowerCase(), label: fruit };
}

const fruitValues = fruits.map(fruitValue);

/** Renders `ui` into a block container of a fixed width, under a real `ThemeProvider`. `inset`
 * moves the container in from the page's left margin. */
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

/** Renders `ui` into a fixed-position container whose left edge sits `left` pixels from the
 * viewport's left edge and whose top sits `top` pixels from its top — free of the page body's
 * margin, so `left: 0` is flush with the viewport and a negative `left` is partly off-screen. */
function renderAt(left: number, top: number, width: number, ui: ReactNode) {
  const { container } = render(
    <ThemeProvider>
      <div style={{ position: "fixed", left: `${left}px`, top: `${top}px`, width: `${width}px` }}>{ui}</div>
    </ThemeProvider>,
  );
  return { container };
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

/** Every case here is a `searchable={false}` one: the field and the listbox are measured with no
 * search row above them, and `getByRole("combobox")` resolves to the one combobox on the page.
 * The search row's own measurements and its real focus moves are the block at the end of this
 * file, which passes the prop nowhere. */
describe("Dropdown under a real ThemeProvider", () => {
  it("shows the field's surface behind a hovered trigger", async () => {
    renderInto(
      300,
      <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    const trigger = screen.getByRole("combobox");
    await userEvent.hover(trigger);

    // A fill of the trigger's own draws a second, smaller box inside the field's border. The
    // trigger is transparent, so what shows through it is the field's own surface and hover.
    expect(getComputedStyle(trigger).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("keeps a multi-select field within a narrow container", () => {
    const { container, box } = renderInto(
      150,
      <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
        {fruitOptions}
      </Dropdown>,
    );

    expect(fieldOf(container).getBoundingClientRect().right).toBeLessThanOrEqual(box.getBoundingClientRect().right);
  });

  it("keeps a chip wider than its container inside the field's border", () => {
    const { container, box } = renderInto(
      240,
      <Dropdown
        searchable={false}
        multiple
        aria-label="Word"
        defaultValue={[{ value: "long", label: "Pneumonoultramicroscopicsilicovolcanoconiosis" }]}
      >
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
      <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
        {fruitOptions}
      </Dropdown>,
    );

    const chipTops = new Set(
      Array.from(container.querySelectorAll(".tandiko-listbox-chip"), (chip) => Math.round(chip.getBoundingClientRect().top)),
    );
    expect(fieldOf(container).getBoundingClientRect().width).toBeCloseTo(box.getBoundingClientRect().width, 0);
    expect(chipTops.size).toBeGreaterThan(1);
  });

  it("fills a container wider than its content", () => {
    const { container } = renderInto(
      400,
      <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "a", label: "A" }}>
        <Dropdown.Option value="a" label="A" />
      </Dropdown>,
    );

    expect(fieldOf(container).getBoundingClientRect().width).toBeCloseTo(400, 0);
  });

  it("sizes the trigger's selected-option icon to the icon scale's 16px step", async () => {
    renderInto(
      300,
      <Dropdown searchable={false} aria-label="Adjustment" defaultValue={{ value: "add", label: "Add", icon: Plus }}>
        <Dropdown.Option value="add" label="Add" icon={Plus} />
      </Dropdown>,
    );

    const icon = document.querySelector(".tandiko-dropdown-trigger-icon") as SVGElement;
    const { width, height } = icon.getBoundingClientRect();
    expect(width).toBeCloseTo(16, 0);
    expect(height).toBeCloseTo(16, 0);
  });

  it("stands a single-select field at the size scale's control step", () => {
    const { container } = renderInto(
      300,
      <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
        <Dropdown.Option value="small" label="Small" />
      </Dropdown>,
    );

    expect(fieldOf(container).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
  });

  it("fills the field's height with the trigger", () => {
    const { container } = renderInto(
      300,
      <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
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
      <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
        {fruitOptions}
      </Dropdown>,
    );

    expect(screen.getByRole("combobox").getBoundingClientRect().width).toBeGreaterThanOrEqual(CONTROL_STEP - 0.5);
  });

  describe("the chip row", () => {
    it("keeps a field with one row of chips at the control step", () => {
      const { container } = renderInto(
        300,
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={[fruitValue("Apple"), fruitValue("Fig")]}>
          {fruitOptions}
        </Dropdown>,
      );

      const chipTops = new Set(
        Array.from(container.querySelectorAll(".tandiko-listbox-chip"), (chip) => Math.round(chip.getBoundingClientRect().top)),
      );
      expect(chipTops.size).toBe(1);
      expect(fieldOf(container).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
    });

    it("stands a field as tall with one row of chips as with none", () => {
      const { container } = renderInto(
        300,
        <>
          <Dropdown searchable={false} multiple aria-label="Empty" defaultValue={[]}>
            {fruitOptions}
          </Dropdown>
          <Dropdown searchable={false} multiple aria-label="Chosen" defaultValue={[fruitValue("Apple")]}>
            {fruitOptions}
          </Dropdown>
        </>,
      );

      const [empty, chosen] = Array.from(
        container.querySelectorAll(".tandiko-dropdown-control"),
        (field) => field.getBoundingClientRect().height,
      );
      expect(chosen).toBeCloseTo(empty as number, 0);
    });

    it("keeps air between wrapped chips and the field's border", () => {
      const { container } = renderInto(
        240,
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
          {fruitOptions}
        </Dropdown>,
      );

      const field = fieldOf(container);
      const chips = Array.from(container.querySelectorAll(".tandiko-listbox-chip"), (chip) => chip.getBoundingClientRect());
      expect(new Set(chips.map((chip) => Math.round(chip.top))).size).toBeGreaterThan(1);
      // Measured against the padding box: the border is the field's, and a chip flush against its
      // inner edge reads as touching it.
      const innerTop = field.getBoundingClientRect().top + field.clientTop;
      const innerBottom = innerTop + field.clientHeight;
      expect(Math.min(...chips.map((chip) => chip.top)) - innerTop).toBeGreaterThan(0.5);
      expect(innerBottom - Math.max(...chips.map((chip) => chip.bottom))).toBeGreaterThan(0.5);
    });
  });

  it("sets the chevron against the field's trailing edge", () => {
    const { container } = renderInto(
      300,
      <Dropdown searchable={false} aria-label="Size" placeholder="Pick">
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
      <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
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
      <Dropdown searchable={false} aria-label="Size" aria-invalid>
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
      <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
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

    /** Sets the field in open page space, clear of every viewport edge; the edge cases have tests
     * of their own. */
    const INSET = 40;

    it("matches the field's width and left edge beside a row of chips", async () => {
      const { container } = renderInto(
        300,
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues.slice(0, 4)}>
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
        <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
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
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={[fruitValue("Apple")]}>
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

    describe("at the viewport's edge", () => {
      it("matches the field's left edge, width and right edge when the field is flush with the viewport's left edge", async () => {
        const { container } = renderAt(
          0,
          40,
          300,
          <Dropdown searchable={false} aria-label="Fruit">
            {fruitOptions}
          </Dropdown>,
        );
        const field = fieldOf(container);
        expect(field.getBoundingClientRect().left).toBe(0);

        await userEvent.click(screen.getByRole("combobox"));

        const listbox = screen.getByRole("listbox");
        await expect.poll(() => listbox.getBoundingClientRect().left).toBeCloseTo(field.getBoundingClientRect().left, 0);
        expect(listbox.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
        expect(listbox.getBoundingClientRect().right).toBeCloseTo(field.getBoundingClientRect().right, 0);
        expect(listbox.getBoundingClientRect().top).toBeCloseTo(field.getBoundingClientRect().bottom + LISTBOX_OFFSET, 0);
      });

      it("matches the field exactly, off-screen part included, when the field starts past the viewport's left edge", async () => {
        const { container } = renderAt(
          -40,
          40,
          300,
          <Dropdown searchable={false} aria-label="Fruit">
            {fruitOptions}
          </Dropdown>,
        );
        const field = fieldOf(container);
        expect(field.getBoundingClientRect().left).toBe(-40);

        await userEvent.click(screen.getByRole("combobox"));

        const listbox = screen.getByRole("listbox");
        await expect.poll(() => listbox.getBoundingClientRect().left).toBeCloseTo(field.getBoundingClientRect().left, 0);
        expect(listbox.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
      });

      it("opens above the field when there is no room for it below", async () => {
        const { container } = renderAt(
          40,
          window.innerHeight - 48,
          300,
          <Dropdown searchable={false} aria-label="Fruit">
            {fruitOptions}
          </Dropdown>,
        );
        const field = fieldOf(container);

        await userEvent.click(screen.getByRole("combobox"));

        const listbox = screen.getByRole("listbox");
        expect(listbox.getBoundingClientRect().height).toBeGreaterThan(window.innerHeight - field.getBoundingClientRect().bottom);
        await expect.poll(() => listbox.getBoundingClientRect().bottom).toBeCloseTo(field.getBoundingClientRect().top - LISTBOX_OFFSET, 0);
        expect(listbox.getBoundingClientRect().left).toBeCloseTo(field.getBoundingClientRect().left, 0);
        expect(listbox.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
      });
    });

    it("keeps the listbox open while a chip is removed from the field", async () => {
      renderInto(
        300,
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues.slice(0, 2)}>
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
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues.slice(0, 2)}>
          {fruitOptions}
        </Dropdown>,
        INSET,
      );

      await userEvent.click(screen.getByRole("button", { name: "Remove Apple" }));

      expect(screen.queryByRole("button", { name: "Remove Apple" })).toBeNull();
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    });

    it("keeps focus and a working keyboard on the trigger when the field's padding is pressed", async () => {
      const { container } = renderInto(
        300,
        <Dropdown searchable={false} aria-label="Fruit">
          {fruitOptions}
        </Dropdown>,
        INSET,
      );

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
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues.slice(0, 2)}>
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
      const { container } = renderInto(
        300,
        <Dropdown searchable={false} aria-label="Fruit">
          {fruitOptions}
        </Dropdown>,
        INSET,
      );

      await userEvent.click(fieldOf(container), { position: { x: 4, y: 16 } });

      const trigger = screen.getByRole("combobox");
      expect(document.activeElement).toBe(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("closes when pressed outside the field", async () => {
      renderInto(
        300,
        <Dropdown searchable={false} aria-label="Size">
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
        <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
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
        <Dropdown searchable={false} aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
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
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={[fruitValue("Apple")]}>
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

/** The default: nothing in this block passes `searchable`. Real focus moves out of the trigger
 * and back again here, which is the part jsdom cannot settle. */
describe("a searchable Dropdown under a real ThemeProvider", () => {
  async function open() {
    renderInto(
      300,
      <Dropdown aria-label="Fruit" placeholder="Pick fruit">
        {fruitOptions}
      </Dropdown>,
    );
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await userEvent.click(trigger);
    return { trigger, search: screen.getByRole("combobox", { name: "Search" }) };
  }

  it("puts real focus in the search input as the panel opens", async () => {
    const { trigger, search } = await open();

    expect(document.activeElement).toBe(search);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("narrows the options to what is typed, with the caret staying in the search input", async () => {
    const { search } = await open();

    await userEvent.type(search, "err");

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Cherry", "Elderberry"]);
    expect(document.activeElement).toBe(search);
  });

  it("puts the caret after the character that seeded the search", async () => {
    renderInto(
      300,
      <Dropdown aria-label="Fruit" placeholder="Pick fruit">
        {fruitOptions}
      </Dropdown>,
    );
    screen.getByRole("combobox", { name: "Fruit" }).focus();

    await userEvent.keyboard("f");
    const search = screen.getByRole("combobox", { name: "Search" }) as HTMLInputElement;
    await expect.poll(() => document.activeElement).toBe(search);
    expect(search.selectionStart).toBe(1);

    await userEvent.keyboard("i");
    expect(search).toHaveValue("fi");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Fig"]);
  });

  it("returns focus to the trigger when an option is picked", async () => {
    const { trigger, search } = await open();

    await userEvent.type(search, "fig");
    await userEvent.click(screen.getByRole("option", { name: "Fig" }));

    expect(screen.queryByRole("listbox")).toBeNull();
    await expect.poll(() => document.activeElement).toBe(trigger);
    expect(trigger).toHaveTextContent("Fig");
  });
});
