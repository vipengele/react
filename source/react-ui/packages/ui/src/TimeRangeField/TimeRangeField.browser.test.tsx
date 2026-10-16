import { cleanup, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import { Locale, LocalTime } from "@vipengele/ts";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { TimeRange } from "../internal/localRange.js";
import { TimeRangeField } from "./TimeRangeField.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

const enUS = new Locale("en-US");

const field = () => screen.getByRole("group", { name: "Shift" });
const editor = (end: "Start" | "End") => screen.getByRole("group", { name: `Shift ${end}` });
const segment = (end: "Start" | "End", label: "Hour" | "Minute" | "AM/PM") => within(editor(end)).getByRole("spinbutton", { name: label });
const range = (start: LocalTime, end: LocalTime): TimeRange => ({ start, end });

/** The colour a `--vpg-*` role token resolves to as a text colour, read by consuming it as a real
 * property on a probe inside the themed root. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

/** The style once its transitions have run, so a state change is read at its end value. */
function settledStyle(element: Element): CSSStyleDeclaration {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
  return getComputedStyle(element);
}

function Themed({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("TimeRangeField under a real ThemeProvider", () => {
  it("fills the field's height with its outer group and lays both editors out on one line, start first", () => {
    render(
      <Themed>
        <TimeRangeField aria-label="Shift" locale={enUS} defaultValue={range(LocalTime.of(9, 0), LocalTime.of(17, 0))} />
      </Themed>,
    );
    const shell = field().parentElement as HTMLElement;
    expect(shell).toHaveClass("vpg-field-shell");
    expect(field().getBoundingClientRect().height).toBeCloseTo(shell.clientHeight, 0);
    const start = editor("Start").getBoundingClientRect();
    const end = editor("End").getBoundingClientRect();
    expect(start.right).toBeLessThanOrEqual(end.left);
    expect(start.top).toBeCloseTo(end.top, 0);
  });

  it("moves across the editors with the arrow keys, both ways", async () => {
    render(
      <Themed>
        <TimeRangeField aria-label="Shift" locale={enUS} defaultValue={range(LocalTime.of(9, 0), LocalTime.of(17, 0))} />
      </Themed>,
    );
    await userEvent.click(segment("Start", "AM/PM"));
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(segment("End", "Hour"));
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(document.activeElement).toBe(segment("End", "AM/PM"));
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(segment("Start", "AM/PM"));
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(segment("Start", "Hour"));
  });

  it("moves across the editors in visual order right to left", async () => {
    render(
      <Themed>
        <div dir="rtl">
          <TimeRangeField aria-label="Shift" locale={enUS} />
        </div>
      </Themed>,
    );
    expect(editor("Start").getBoundingClientRect().left).toBeGreaterThan(editor("End").getBoundingClientRect().left);
    await userEvent.click(segment("Start", "AM/PM"));
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(segment("End", "Hour"));
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(segment("Start", "AM/PM"));
  });

  it("types a whole range through both editors and commits it once", async () => {
    const onChange = vi.fn();
    render(
      <Themed>
        <TimeRangeField aria-label="Shift" locale={enUS} onChange={onChange} />
      </Themed>,
    );
    await userEvent.click(segment("Start", "Hour"));
    await userEvent.keyboard("0830a");
    expect(document.activeElement).toBe(segment("End", "Hour"));
    await userEvent.keyboard("0445p");
    expect(onChange).toHaveBeenCalledOnce();
    const committed = onChange.mock.calls[0]?.[0] as TimeRange;
    expect(`${committed.start.toString()}/${committed.end.toString()}`).toBe("08:30/16:45");
  });

  it("tabs through every segment of both editors in logical order", async () => {
    render(
      <Themed>
        <TimeRangeField aria-label="Shift" locale={enUS} />
      </Themed>,
    );
    await userEvent.tab();
    const visited = [document.activeElement];
    for (let step = 0; step < 5; step += 1) {
      await userEvent.tab();
      visited.push(document.activeElement);
    }
    expect(visited).toEqual([
      segment("Start", "Hour"),
      segment("Start", "Minute"),
      segment("Start", "AM/PM"),
      segment("End", "Hour"),
      segment("End", "Minute"),
      segment("End", "AM/PM"),
    ]);
  });

  it("draws the danger border around a reversed range, and keeps it once focus leaves", async () => {
    render(
      <Themed>
        <TimeRangeField aria-label="Shift" locale={enUS} />
        <button type="button">After</button>
      </Themed>,
    );
    const shell = field().parentElement as HTMLElement;
    const danger = resolvedColour("--vpg-danger");
    await userEvent.click(segment("Start", "Hour"));
    await userEvent.keyboard("0500p0900a");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(settledStyle(shell).borderTopColor).toBe(danger);
    await userEvent.click(screen.getByRole("button", { name: "After" }));
    expect(settledStyle(shell).borderTopColor).toBe(danger);
    expect(segment("Start", "Hour").textContent).toBe("05");
    expect(segment("End", "Hour").textContent).toBe("09");
  });

  it("rings the field on keyboard focus in either editor", async () => {
    render(
      <Themed>
        <TimeRangeField aria-label="Shift" locale={enUS} />
      </Themed>,
    );
    const shell = field().parentElement as HTMLElement;
    await userEvent.click(segment("End", "Hour"));
    expect(settledStyle(shell).boxShadow).toBe("none");
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(segment("End", "Minute"));
    expect(settledStyle(shell).boxShadow).not.toBe("none");
  });
});
