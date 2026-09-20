import { ThemeProvider } from "@tandiko/tokens";
import { User } from "@tandiko/icons";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Autocomplete } from "../Autocomplete/Autocomplete.js";
import { Dropdown } from "../Dropdown/Dropdown.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(async () => {
  await userEvent.unhover(document.body);
  cleanup();
});

/** Renders a `Dropdown` into a block container of a fixed width, under a real `ThemeProvider`,
 * and opens it. `Dropdown` is the shared listbox stylesheet's only exported consumer here — a
 * bare option row has no meaning outside a component that renders `role="listbox"`/`"option"`. */
async function renderOpenDropdown(width: number) {
  const { container } = render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${width}px` }}>
        <Dropdown aria-label="Assignee" defaultValue={{ value: "ada", label: "Ada Lovelace", icon: User }}>
          <Dropdown.Option value="ada" label="Ada Lovelace" icon={User} />
          <Dropdown.Option value="grace" label="Grace Hopper" />
        </Dropdown>
      </div>
    </ThemeProvider>,
  );
  await userEvent.click(screen.getByRole("combobox"));
  return {
    field: container.querySelector(".tandiko-dropdown-control") as HTMLElement,
    listbox: screen.getByRole("listbox"),
  };
}

describe("the shared listbox stylesheet, under a real ThemeProvider", () => {
  it("matches the listbox's width to the field's", async () => {
    const { field, listbox } = await renderOpenDropdown(120);

    await expect.poll(() => listbox.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
  });

  it("sizes an option row to the control scale's md step", async () => {
    const { listbox } = await renderOpenDropdown(300);

    const option = screen.getByRole("option", { name: "Ada Lovelace" });
    expect(option.getBoundingClientRect().height).toBeCloseTo(32, 0);
    // Sanity: the row belongs to the listbox this test opened, not some stray leftover markup.
    expect(listbox.contains(option)).toBe(true);
  });

  it("rounds an option row's corner to the radius ladder's sm step", async () => {
    await renderOpenDropdown(300);

    const option = screen.getByRole("option", { name: "Ada Lovelace" });
    expect(getComputedStyle(option).borderRadius).toBe("6px");
  });

  it("sizes an option's leading icon to the icon scale's 16px step", async () => {
    await renderOpenDropdown(300);

    const icon = document.querySelector(".tandiko-listbox-option-icon") as SVGElement;
    const { width, height } = icon.getBoundingClientRect();
    expect(width).toBeCloseTo(16, 0);
    expect(height).toBeCloseTo(16, 0);
  });

  describe("a chip", () => {
    /** One chip in each component that renders one, since both read the same chip rules. */
    function renderChips() {
      render(
        <ThemeProvider>
          <div style={{ width: "300px" }}>
            <Dropdown multiple aria-label="Fruit" defaultValue={[{ value: "apple", label: "Apple" }]}>
              <Dropdown.Option value="apple" label="Apple" />
            </Dropdown>
            <Autocomplete multiple aria-label="Berry" defaultValue={["fig"]}>
              <Autocomplete.Option value="fig" label="Fig" />
            </Autocomplete>
          </div>
        </ThemeProvider>,
      );
      return Array.from(document.querySelectorAll<HTMLElement>(".tandiko-listbox-chip"));
    }

    it("stands a chip at the control scale's xs step", () => {
      const chips = renderChips();

      expect(chips).toHaveLength(2);
      for (const chip of chips) {
        expect(chip.getBoundingClientRect().height).toBeCloseTo(24, 0);
      }
    });

    it("sizes the remove glyph to the icon scale's 14px step", () => {
      renderChips();

      for (const glyph of document.querySelectorAll(".tandiko-listbox-chip-remove svg")) {
        const { width, height } = glyph.getBoundingClientRect();
        expect(width).toBeCloseTo(14, 0);
        expect(height).toBeCloseTo(14, 0);
      }
    });

    it("gives the remove button the chip's full inner height as a square target", () => {
      renderChips();

      for (const button of document.querySelectorAll(".tandiko-listbox-chip-remove")) {
        const chip = button.closest(".tandiko-listbox-chip") as HTMLElement;
        const { width, height } = button.getBoundingClientRect();
        expect(height).toBeCloseTo(chip.clientHeight, 0);
        expect(width).toBeCloseTo(height, 0);
      }
    });
  });
});
