import { ThemeProvider } from "@vipengele/react-tokens";
import { User } from "@vipengele/react-icons";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
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
 * bare option row has no meaning outside a component that renders `role="listbox"`/`"option"`.
 * `searchable={false}` makes the listbox the floating element itself, which is what the rules
 * measured below draw. */
async function renderOpenDropdown(width: number) {
  const { container } = render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${width}px` }}>
        <Dropdown searchable={false} aria-label="Assignee" defaultValue={{ value: "ada", label: "Ada Lovelace", icon: User }}>
          <Dropdown.Option value="ada" label="Ada Lovelace" icon={User} />
          <Dropdown.Option value="grace" label="Grace Hopper" />
        </Dropdown>
      </div>
    </ThemeProvider>,
  );
  await userEvent.click(screen.getByRole("combobox"));
  return {
    field: container.querySelector(".vpg-dropdown-control") as HTMLElement,
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

    const icon = document.querySelector(".vpg-listbox-option-icon") as SVGElement;
    const { width, height } = icon.getBoundingClientRect();
    expect(width).toBeCloseTo(16, 0);
    expect(height).toBeCloseTo(16, 0);
  });

  describe("the panel a search row turns the listbox into", () => {
    /** The same `Dropdown` at `searchable`'s default, so the floating element is the panel and the
     * listbox is the scrolling box inside it. */
    async function renderOpenPanel(width: number) {
      const { container } = render(
        <ThemeProvider>
          <div style={{ width: `${width}px` }}>
            <Dropdown aria-label="Assignee">
              <Dropdown.Option value="ada" label="Ada Lovelace" icon={User} />
              <Dropdown.Option value="grace" label="Grace Hopper" />
            </Dropdown>
          </div>
        </ThemeProvider>,
      );
      await userEvent.click(screen.getByRole("combobox", { name: "Assignee" }));
      return {
        field: container.querySelector(".vpg-dropdown-control") as HTMLElement,
        panel: document.querySelector(".vpg-listbox-panel") as HTMLElement,
        row: document.querySelector(".vpg-listbox-search") as HTMLElement,
      };
    }

    it("matches the panel's width to the field's", async () => {
      const { field, panel } = await renderOpenPanel(120);

      await expect.poll(() => panel.getBoundingClientRect().width).toBeCloseTo(field.getBoundingClientRect().width, 0);
    });

    it("stands the search row above the options, at the control scale's md step", async () => {
      const { row } = await renderOpenPanel(300);

      const listbox = screen.getByRole("listbox");
      expect(row.getBoundingClientRect().height).toBeCloseTo(32, 0);
      expect(row.getBoundingClientRect().bottom).toBeLessThanOrEqual(listbox.getBoundingClientRect().top);
    });

    it("divides the search row from the options below it", async () => {
      const { row } = await renderOpenPanel(300);

      expect(getComputedStyle(row).borderBottomWidth).toBe("1px");
      expect(getComputedStyle(row).borderBottomStyle).toBe("solid");
    });
  });

  describe("a chip", () => {
    function renderChips() {
      render(
        <ThemeProvider>
          <div style={{ width: "300px" }}>
            <Dropdown searchable={false} multiple aria-label="Fruit" defaultValue={[{ value: "apple", label: "Apple" }]}>
              <Dropdown.Option value="apple" label="Apple" />
            </Dropdown>
          </div>
        </ThemeProvider>,
      );
      return Array.from(document.querySelectorAll<HTMLElement>(".vpg-listbox-chip"));
    }

    it("stands a chip at the control scale's xs step", () => {
      const chips = renderChips();

      expect(chips).toHaveLength(1);
      for (const chip of chips) {
        expect(chip.getBoundingClientRect().height).toBeCloseTo(24, 0);
      }
    });

    it("sizes the remove glyph to the icon scale's 14px step", () => {
      renderChips();

      for (const glyph of document.querySelectorAll(".vpg-listbox-chip-remove svg")) {
        const { width, height } = glyph.getBoundingClientRect();
        expect(width).toBeCloseTo(14, 0);
        expect(height).toBeCloseTo(14, 0);
      }
    });

    it("gives the remove button the chip's full inner height as a square target", () => {
      renderChips();

      for (const button of document.querySelectorAll(".vpg-listbox-chip-remove")) {
        const chip = button.closest(".vpg-listbox-chip") as HTMLElement;
        const { width, height } = button.getBoundingClientRect();
        expect(height).toBeCloseTo(chip.clientHeight, 0);
        expect(width).toBeCloseTo(height, 0);
      }
    });
  });
});
