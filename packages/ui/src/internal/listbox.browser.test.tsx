import { ThemeProvider } from "@tandiko/tokens";
import { User } from "@tandiko/icons";
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
 * bare option row has no meaning outside a component that renders `role="listbox"`/`"option"`. */
async function renderOpenDropdown(width: number) {
  const { container } = render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${width}px` }}>
        <Dropdown aria-label="Assignee" defaultValue="ada">
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
  it("keeps the listbox exactly as wide as a field narrower than the panel's old floor", async () => {
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
});
