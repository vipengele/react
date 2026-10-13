import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalDateTime } from "@vipengele/ts";
import { afterEach, describe, expect, it } from "vitest";
import { DateTimeField } from "./DateTimeField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

const enUS = new Locale("en-US");

/** A field inside a container of a fixed width, so its layout does not depend on the viewport. */
function renderAt(width: string) {
  return render(
    <ThemeProvider>
      <div style={{ width }}>
        <DateTimeField aria-label="Starts" locale={enUS} defaultValue={LocalDateTime.parse("2026-10-01T09:30")} />
      </div>
    </ThemeProvider>,
  );
}

/** The two halves' field boxes, date first. */
function shells(): [DOMRect, DOMRect] {
  const [date, time] = [...screen.getByRole("group", { name: "Starts" }).querySelectorAll(":scope > .vpg-field-shell")];
  return [(date as HTMLElement).getBoundingClientRect(), (time as HTMLElement).getBoundingClientRect()];
}

describe("DateTimeField's layout", () => {
  it("sets the halves side by side on one row when the container holds both", () => {
    renderAt("640px");
    const [date, time] = shells();
    expect(time.top).toBeCloseTo(date.top, 0);
    expect(time.left).toBeGreaterThanOrEqual(date.right);
    expect(time.right).toBeLessThanOrEqual(date.left + 640 + 0.5);
  });

  it("shares a wide row equally between the halves", () => {
    renderAt("640px");
    const [date, time] = shells();
    expect(date.width).toBeCloseTo(time.width, 0);
  });

  it("wraps the time half below the date half in a narrow container", () => {
    renderAt("240px");
    const [date, time] = shells();
    expect(time.top).toBeGreaterThanOrEqual(date.bottom);
    expect(time.left).toBeCloseTo(date.left, 0);
    expect(date.width).toBeLessThanOrEqual(240.5);
    expect(time.width).toBeLessThanOrEqual(240.5);
  });

  it("keeps both halves inside a container narrower than one half's basis", () => {
    renderAt("120px");
    const [date, time] = shells();
    expect(date.width).toBeLessThanOrEqual(120.5);
    expect(time.width).toBeLessThanOrEqual(120.5);
  });
});
