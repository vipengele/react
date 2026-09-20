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

/** The chips the field actually draws. A chip the row has no width for is taken out of the flow
 * altogether, so it reports no box — which is what separates a collapsed chip from one merely
 * squeezed narrow. */
function shownChips(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll(".tandiko-listbox-chip")).filter((chip) => chip.getBoundingClientRect().width > 0);
}

function shownChipLabels(container: HTMLElement): string[] {
  return shownChips(container).map((chip) => chip.querySelector(".tandiko-listbox-chip-label")?.textContent ?? "");
}

/** What the overflow indicator reads, or `null` while the row shows every chip — it stays in the
 * DOM either way, since the measurement reserves the width it would take. */
function shownOverflow(container: HTMLElement): string | null {
  const indicator = container.querySelector(".tandiko-listbox-overflow-chip");
  if (indicator === null || indicator.getBoundingClientRect().width === 0) {
    return null;
  }
  return indicator.textContent;
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

  // A grid item's `width: 100%` resolves against a grid area that is itself sized from the item,
  // so it is indefinite and contributes no specified size suggestion: the field's automatic
  // minimum size falls back to its min-content, which a full row of chips makes far wider than
  // the track. Only the field's own `min-width` keeps it inside its container here — a block
  // container of the same width fills correctly either way, which is why this needs its own case.
  it("fills a grid container rather than forcing its track open", () => {
    const { container } = render(
      <ThemeProvider>
        <div data-testid="container" style={{ width: "150px", display: "grid" }}>
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>
        </div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("container").getBoundingClientRect().width).toBeCloseTo(150, 0);
    expect(fieldOf(container).getBoundingClientRect().width).toBeCloseTo(150, 0);
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
      <Dropdown searchable={false} wrapChips multiple aria-label="Fruit" defaultValue={fruitValues}>
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
        <Dropdown searchable={false} wrapChips multiple aria-label="Fruit" defaultValue={fruitValues}>
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

    /**
     * The measurement itself, which only an engine that lays out has an answer for: jsdom's
     * `ResizeObserver` is a stub whose callback never fires, and every box it reports is zero
     * wide.
     *
     * The widths below are the ones the default seed produces for these labels in this engine, and
     * each field is sized to the answer it asks about. A chip count would have had to be tuned to
     * exactly one of these fields.
     *
     * The indicator is wider than a short fruit's chip, so a row that drops a short chip drops the
     * one before it too — the two together free less width than the indicator costs. Dropping
     * exactly one chip means dropping a chip wider than the indicator, which is what
     * `Honeydew melon` is here.
     */
    describe("collapsed to one row", () => {
      it("shows every chip while the row has width for them all", () => {
        const { container } = renderInto(
          400,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={[fruitValue("Apple"), fruitValue("Fig")]}>
            {fruitOptions}
          </Dropdown>,
        );

        expect(shownChipLabels(container)).toEqual(["Apple", "Fig"]);
        expect(shownOverflow(container)).toBeNull();
      });

      it("hides the one chip the row has no width for and counts it in the indicator", () => {
        const { container } = renderInto(
          350,
          <Dropdown
            searchable={false}
            multiple
            aria-label="Fruit"
            defaultValue={[fruitValue("Apple"), fruitValue("Banana"), { value: "melon", label: "Honeydew melon" }]}
          >
            {fruitOptions}
          </Dropdown>,
        );

        expect(shownChipLabels(container)).toEqual(["Apple", "Banana"]);
        expect(shownOverflow(container)).toBe("and 1 more");
      });

      it("counts every chip the row has no width for, however many that is", () => {
        const { container } = renderInto(
          300,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );

        expect(shownChipLabels(container)).toEqual(["Apple"]);
        expect(shownOverflow(container)).toBe(`and ${fruits.length - 1} more`);
      });

      it("keeps a field of collapsed chips at the control step", () => {
        const { container } = renderInto(
          300,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );

        const chipTops = new Set(shownChips(container).map((chip) => Math.round(chip.getBoundingClientRect().top)));
        expect(chipTops.size).toBe(1);
        expect(fieldOf(container).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
      });

      it("takes more chips back onto the row as the field widens", async () => {
        const { container, box } = renderInto(
          300,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );
        expect(shownChipLabels(container)).toHaveLength(1);

        box.style.width = "600px";

        await expect.poll(() => shownChipLabels(container)).toEqual(["Apple", "Banana", "Cherry", "Damson"]);
        expect(shownOverflow(container)).toBe(`and ${fruits.length - 4} more`);
      });

      it("takes chips off the row as the field narrows", async () => {
        const { container, box } = renderInto(
          600,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );
        expect(shownChipLabels(container)).toHaveLength(4);

        box.style.width = "300px";

        await expect.poll(() => shownChipLabels(container)).toEqual(["Apple"]);
        expect(shownOverflow(container)).toBe(`and ${fruits.length - 1} more`);
      });

      it("shows a chip wider than the field alone, with its label cut short", () => {
        const { container } = renderInto(
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
        const [chip] = shownChips(container);
        const label = container.querySelector(".tandiko-listbox-chip-label") as HTMLElement;
        expect(shownOverflow(container)).toBeNull();
        expect((chip as HTMLElement).getBoundingClientRect().right).toBeLessThanOrEqual(field.getBoundingClientRect().right);
        // A label rendered in full is exactly as wide as it scrolls; one cut short by the
        // ellipsis scrolls further than the box showing it.
        expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
      });

      it("holds a chip too wide to share the row with the indicator on the row anyway", () => {
        const { container } = renderInto(
          240,
          <Dropdown
            searchable={false}
            multiple
            aria-label="Word"
            defaultValue={[{ value: "long", label: "Pneumonoultramicroscopicsilicovolcanoconiosis" }, fruitValue("Fig")]}
          >
            {fruitOptions}
          </Dropdown>,
        );

        const field = fieldOf(container);
        // One chip always shows: a field of nothing but an indicator says how many selections
        // there are and names none of them. It gives way to the indicator rather than pushing it
        // onto a second row or past the field's border.
        expect(shownChipLabels(container)).toHaveLength(1);
        expect(shownOverflow(container)).toBe("and 1 more");
        expect(field.getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
        const indicator = container.querySelector(".tandiko-listbox-overflow-chip") as HTMLElement;
        expect(indicator.getBoundingClientRect().right).toBeLessThanOrEqual(field.getBoundingClientRect().right);
      });

      it("names the chips it stands for in a tooltip on hover", async () => {
        const { container } = renderInto(
          300,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );

        const shown = shownChipLabels(container);
        await userEvent.hover(container.querySelector(".tandiko-listbox-overflow-chip") as HTMLElement);

        const bubble = await screen.findByRole("tooltip");
        expect(bubble).toHaveTextContent(fruits.filter((fruit) => !shown.includes(fruit)).join(", "));
      });

      it("keeps the indicator out of the field's tab order", async () => {
        const { container } = renderInto(
          300,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );

        // The indicator stands between the last chip on the row and the trigger, so a tab stop on
        // it would be the stop a backwards tab from the trigger lands on — and it has nothing to
        // do with a keystroke: the selections it covers are unpicked in the listbox.
        screen.getByRole("combobox").focus();
        await userEvent.tab({ shift: true });

        const [lastShown] = shownChipLabels(container).slice(-1);
        expect(document.activeElement).toBe(screen.getByRole("button", { name: `Remove ${lastShown}` }));
      });

      it("removes a selection the row has no width for by unchecking it in the listbox", async () => {
        const { container } = renderInto(
          300,
          <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );
        const hidden = fruits.filter((fruit) => !shownChipLabels(container).includes(fruit));

        await userEvent.click(screen.getByRole("combobox"));
        await userEvent.click(screen.getByRole("option", { name: hidden[0] as string }));

        expect(screen.getByRole("option", { name: hidden[0] as string })).toHaveAttribute("aria-selected", "false");
        await expect.poll(() => shownOverflow(container)).toBe(`and ${hidden.length - 1} more`);
      });

      it("wraps its chips and measures nothing when asked to wrap", () => {
        const { container } = renderInto(
          300,
          <Dropdown searchable={false} wrapChips multiple aria-label="Fruit" defaultValue={fruitValues}>
            {fruitOptions}
          </Dropdown>,
        );

        expect(shownChipLabels(container)).toEqual(fruits);
        expect(container.querySelector(".tandiko-listbox-overflow-chip")).toBeNull();
        expect(fieldOf(container).getBoundingClientRect().height).toBeGreaterThan(CONTROL_STEP);
      });
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

  /**
   * The same measurement against a `multiple` trigger, whose whole content is the chevron: the
   * chips carry the selection and stand beside the trigger, not in it. Nothing in the trigger
   * claims its free space, so only the chevron's own auto margin holds it against the field's
   * edge — a case the placeholder fixture above cannot express, since a placeholder is itself the
   * `flex: 1` sibling that does that job.
   *
   * Both shapes of selected row are measured. They leave the trigger different amounts of free
   * space, so a chevron adrift sits at a different place in each.
   */
  describe("the chevron beside a chip row", () => {
    /** How far the chevron's trailing edge falls short of the field's content box. */
    function chevronGap(container: HTMLElement): number {
      const field = fieldOf(container);
      const chevron = container.querySelector(".tandiko-dropdown-chevron") as SVGElement;
      expect(chevron).not.toBeNull();
      const contentRight = field.getBoundingClientRect().right - field.clientLeft - Number.parseFloat(getComputedStyle(field).paddingRight);
      return contentRight - chevron.getBoundingClientRect().right;
    }

    it("sets the chevron against the trailing edge beside one row of chips", () => {
      const { container } = renderInto(
        300,
        <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={[fruitValue("Apple"), fruitValue("Fig")]}>
          {fruitOptions}
        </Dropdown>,
      );

      expect(shownOverflow(container)).toBeNull();
      expect(chevronGap(container)).toBeCloseTo(0, 0);
    });

    it("sets the chevron against the trailing edge beside a collapsed chip row", () => {
      const { container } = renderInto(
        350,
        <Dropdown
          searchable={false}
          multiple
          aria-label="Fruit"
          defaultValue={[fruitValue("Apple"), fruitValue("Banana"), { value: "melon", label: "Honeydew melon" }]}
        >
          {fruitOptions}
        </Dropdown>,
      );

      expect(shownOverflow(container)).toBe("and 1 more");
      expect(chevronGap(container)).toBeCloseTo(0, 0);
    });
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
        <Dropdown searchable={false} wrapChips multiple aria-label="Fruit" defaultValue={[fruitValue("Apple")]}>
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

  describe("the clear button", () => {
    it("draws its own focus ring and leaves the field's chrome at rest", async () => {
      const { container } = renderInto(
        300,
        <Dropdown searchable={false} clearable aria-label="Size" defaultValue={{ value: "small", label: "Small" }}>
          <Dropdown.Option value="small" label="Small" />
          <Dropdown.Option value="large" label="Large" />
        </Dropdown>,
      );
      const field = fieldOf(container);
      const clear = screen.getByRole("button", { name: "Clear selection" });
      const restingBorder = getComputedStyle(field).borderColor;
      expect(getComputedStyle(field).boxShadow).toBe("none");

      // The control the shell does read: a focused trigger moves the field's border and draws the
      // ring, so the resting values are a state the shell is demonstrably able to leave. The
      // border transitions between the two, so each reading is polled until it settles.
      await userEvent.tab();
      expect(screen.getByRole("combobox")).toHaveFocus();
      await expect.poll(() => getComputedStyle(field).borderColor).not.toBe(restingBorder);
      expect(getComputedStyle(field).boxShadow).not.toBe("none");

      // The button sits in the trailing slot, which the shell's `> ` state rules do not reach
      // into: the field reads as untouched while the button carries the ring itself.
      await userEvent.tab();
      expect(clear).toHaveFocus();
      await expect.poll(() => getComputedStyle(field).borderColor).toBe(restingBorder);
      await expect.poll(() => getComputedStyle(field).boxShadow).toBe("none");
      expect(getComputedStyle(clear).outlineStyle).toBe("solid");
      expect(Number.parseFloat(getComputedStyle(clear).outlineWidth)).toBeGreaterThan(0);
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

describe("a grouped Dropdown under a real ThemeProvider", () => {
  async function open() {
    renderInto(
      300,
      <Dropdown searchable={false} aria-label="Fruit" placeholder="Pick fruit">
        <Dropdown.Group label="Citrus">
          <Dropdown.Option value="lemon" label="Lemon" />
          <Dropdown.Option value="lime" label="Lime" />
        </Dropdown.Group>
        <Dropdown.Group label="Stone">
          <Dropdown.Option value="peach" label="Peach" />
        </Dropdown.Group>
      </Dropdown>,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
    return {
      citrus: screen.getByRole("group", { name: "Citrus" }),
      stone: screen.getByRole("group", { name: "Stone" }),
      separator: document.querySelector(".tandiko-listbox-separator") as HTMLElement,
    };
  }

  it("draws the separator as a hairline in the gap between the two groups", async () => {
    const { citrus, stone, separator } = await open();

    const line = separator.getBoundingClientRect();
    expect(line.height).toBe(1);
    expect(line.top).toBeGreaterThanOrEqual(citrus.getBoundingClientRect().bottom);
    expect(line.bottom).toBeLessThanOrEqual(stone.getBoundingClientRect().top);
    expect(getComputedStyle(separator).backgroundColor).toBe(resolvedColour("--tandiko-border"));
  });

  it("runs the separator past the edges of the options it divides", async () => {
    const { separator } = await open();

    // The list's own padding holds the options in from the panel's border; the line spans that
    // padding too, so it reads as a division of the list rather than of the options alone.
    const option = screen.getByRole("option", { name: "Lemon" }).getBoundingClientRect();
    const line = separator.getBoundingClientRect();
    expect(line.left).toBeLessThan(option.left);
    expect(line.right).toBeGreaterThan(option.right);
  });

  it("stands a group heading shorter than the option rows under it", async () => {
    await open();

    const heading = (document.querySelector(".tandiko-listbox-group-label") as HTMLElement).getBoundingClientRect();
    expect(heading.height).toBeLessThan(CONTROL_STEP);
  });
});
