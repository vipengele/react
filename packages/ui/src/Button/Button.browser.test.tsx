import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./Button.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one button.
afterEach(cleanup);

describe("Button under a real ThemeProvider", () => {
  it("resolves --tandiko-radius to the theme's literal value, proving the theme reached the browser", () => {
    render(
      <ThemeProvider>
        <Button>Save</Button>
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    const resolved = getComputedStyle(button).getPropertyValue("--tandiko-radius").trim();
    expect(resolved).toBe("0.5rem");
  });

  it("lays the button out with a non-zero box", () => {
    render(
      <ThemeProvider>
        <Button>Save</Button>
      </ThemeProvider>,
    );

    const rect = screen.getByRole("button", { name: "Save" }).getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
});
