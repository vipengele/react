import { type ColorModePreference, ThemeProvider, type ThemeProviderProps } from "@vipengele/react-tokens";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle, type ThemeToggleProps } from "./ThemeToggle.js";

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-theme");
});

/** Mounts a toggle under a provider whose root carries `data-testid="root"`. */
function renderToggle(toggle: ThemeToggleProps = {}, provider: Omit<ThemeProviderProps, "children"> = {}) {
  return render(
    <ThemeProvider data-testid="root" {...provider}>
      <ThemeToggle {...toggle} />
    </ThemeProvider>,
  );
}

function radio(name: string): HTMLInputElement {
  return screen.getByRole("radio", { name }) as HTMLInputElement;
}

function checkedValue(): string | undefined {
  return (screen.getAllByRole("radio") as HTMLInputElement[]).find((input) => input.checked)?.value;
}

describe("ThemeToggle", () => {
  describe("structure", () => {
    it("renders one radio per preference, in light, dark, system order", () => {
      renderToggle();

      expect((screen.getAllByRole("radio") as HTMLInputElement[]).map((input) => input.value)).toEqual(["light", "dark", "system"]);
    });

    it("draws an icon in every segment", () => {
      renderToggle();

      for (const input of screen.getAllByRole("radio")) {
        expect(input.closest("label")?.querySelector("svg.vpg-segmented-control-segment-icon")).not.toBeNull();
      }
    });

    it("throws outside a ThemeProvider, since there is no preference to show or set", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<ThemeToggle />)).toThrow("useColorMode() must be called inside a ThemeProvider.");
    });
  });

  describe("selection", () => {
    it("selects system under a provider that names no mode", () => {
      renderToggle();

      expect(checkedValue()).toBe("system");
    });

    const PREFERENCES: readonly ColorModePreference[] = ["light", "dark", "system"];
    for (const preference of PREFERENCES) {
      it(`selects ${preference} when the provider's preference is ${preference}`, () => {
        renderToggle({}, { defaultColorMode: preference });

        expect(checkedValue()).toBe(preference);
      });
    }

    for (const hostTheme of ["light", "dark"] as const) {
      it(`keeps system selected while it resolves to ${hostTheme}`, () => {
        document.documentElement.setAttribute("data-theme", hostTheme);

        renderToggle({}, { colorMode: "system" });

        expect(checkedValue()).toBe("system");
      });
    }

    it("keeps system selected when the mode it resolves to changes under it", async () => {
      renderToggle();
      expect(checkedValue()).toBe("system");

      document.documentElement.setAttribute("data-theme", "dark");
      // The provider learns of the change through a MutationObserver, whose callback is a microtask.
      await Promise.resolve();

      expect(checkedValue()).toBe("system");
    });

    it("follows a controlled provider's preference when the caller changes it", () => {
      const { rerender } = renderToggle({}, { colorMode: "light" });
      expect(checkedValue()).toBe("light");

      rerender(
        <ThemeProvider data-testid="root" colorMode="dark">
          <ThemeToggle />
        </ThemeProvider>,
      );

      expect(checkedValue()).toBe("dark");
    });
  });

  describe("writing through the provider", () => {
    it("sets an uncontrolled provider's preference to the chosen segment", () => {
      const onColorModeChange = vi.fn();
      renderToggle({}, { onColorModeChange });

      fireEvent.click(radio("Dark"));

      expect(onColorModeChange).toHaveBeenCalledTimes(1);
      expect(onColorModeChange).toHaveBeenCalledWith("dark");
      expect(checkedValue()).toBe("dark");
      expect(screen.getByTestId("root")).toHaveAttribute("data-vpg-mode", "dark");
    });

    it("returns an uncontrolled provider to system, dropping its data-vpg-mode", () => {
      const onColorModeChange = vi.fn();
      renderToggle({}, { defaultColorMode: "light", onColorModeChange });
      expect(screen.getByTestId("root")).toHaveAttribute("data-vpg-mode", "light");

      fireEvent.click(radio("System"));

      expect(onColorModeChange).toHaveBeenCalledWith("system");
      expect(checkedValue()).toBe("system");
      expect(screen.getByTestId("root")).not.toHaveAttribute("data-vpg-mode");
    });

    it("reports the chosen segment to a controlled provider without moving the selection", () => {
      const onColorModeChange = vi.fn();
      renderToggle({}, { colorMode: "light", onColorModeChange });

      fireEvent.click(radio("Dark"));

      expect(onColorModeChange).toHaveBeenCalledTimes(1);
      expect(onColorModeChange).toHaveBeenCalledWith("dark");
      expect(checkedValue()).toBe("light");
      expect(screen.getByTestId("root")).toHaveAttribute("data-vpg-mode", "light");
    });

    it("reports each preference as the value its segment carries", () => {
      const onColorModeChange = vi.fn();
      renderToggle({}, { onColorModeChange });

      fireEvent.click(radio("Light"));
      fireEvent.click(radio("Dark"));
      fireEvent.click(radio("System"));

      expect(onColorModeChange.mock.calls).toEqual([["light"], ["dark"], ["system"]]);
    });
  });

  describe("labels", () => {
    it("names the segments Light, Dark and System by default", () => {
      renderToggle();

      expect(radio("Light").value).toBe("light");
      expect(radio("Dark").value).toBe("dark");
      expect(radio("System").value).toBe("system");
    });

    it("names every segment from labels when all three are given", () => {
      renderToggle({ labels: { light: "Hell", dark: "Dunkel", system: "System folgen" } });

      expect(radio("Hell").value).toBe("light");
      expect(radio("Dunkel").value).toBe("dark");
      expect(radio("System folgen").value).toBe("system");
    });

    it("falls back to the default name for each preference labels leaves out", () => {
      renderToggle({ labels: { dark: "Night" } });

      expect(radio("Light").value).toBe("light");
      expect(radio("Night").value).toBe("dark");
      expect(radio("System").value).toBe("system");
    });
  });

  describe("group name", () => {
    it('names the group "Color mode" when neither aria-label nor aria-labelledby is given', () => {
      renderToggle();

      const group = screen.getByRole("radiogroup", { name: "Color mode" });
      expect(group).toHaveAttribute("aria-label", "Color mode");
      expect(group).not.toHaveAttribute("aria-labelledby");
    });

    it("names the group from aria-label when one is given", () => {
      renderToggle({ "aria-label": "Appearance" });

      expect(screen.getByRole("radiogroup", { name: "Appearance" })).not.toHaveAttribute("aria-labelledby");
    });

    it("names the group from aria-labelledby alone, with no default aria-label beside it", () => {
      render(
        <ThemeProvider>
          <span id="theme-label">Theme</span>
          <ThemeToggle aria-labelledby="theme-label" />
        </ThemeProvider>,
      );

      const group = screen.getByRole("radiogroup", { name: "Theme" });
      expect(group).toHaveAttribute("aria-labelledby", "theme-label");
      expect(group).not.toHaveAttribute("aria-label");
    });
  });

  describe("forwarded props", () => {
    it("gives every radio the name passed", () => {
      renderToggle({ name: "color-mode" });

      for (const input of screen.getAllByRole("radio") as HTMLInputElement[]) {
        expect(input.name).toBe("color-mode");
      }
    });

    it("submits the selected preference under the name passed", () => {
      render(
        <ThemeProvider defaultColorMode="dark">
          <form data-testid="form">
            <ThemeToggle name="color-mode" />
          </form>
        </ThemeProvider>,
      );

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.get("color-mode")).toBe("dark");
    });

    it("shares one generated name between the radios when none is passed", () => {
      renderToggle();

      const names = new Set((screen.getAllByRole("radio") as HTMLInputElement[]).map((input) => input.name));
      expect(names.size).toBe(1);
      expect([...names][0]).not.toBe("");
    });

    it("passes the rest of its props to the SegmentedControl", () => {
      renderToggle({ size: "sm", fullWidth: true, className: "toolbar-toggle", id: "toggle" });

      const group = screen.getByRole("radiogroup", { name: "Color mode" });
      expect(group).toHaveClass("vpg-segmented-control-sm", "vpg-segmented-control-full", "toolbar-toggle");
      expect(group).toHaveAttribute("id", "toggle");
    });
  });
});
