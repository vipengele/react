import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { useRovingFocus } from "./useRovingFocus.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one toolbar.
afterEach(cleanup);

const LABELS = ["Bold", "Italic", "Underline"];

/**
 * A toolbar that owns its tab stop the way a caller of the hook has to: exactly one item has
 * `tabIndex={0}`, and `onNavigate` moves it. The hook itself never writes `tabindex`.
 */
function Toolbar({ initial = 0 }: { initial?: number }) {
  const [stop, setStop] = useState(LABELS[initial]);
  const { onKeyDown } = useRovingFocus<HTMLDivElement>({
    itemSelector: "[data-item]",
    onNavigate: (item) => setStop(item.textContent ?? undefined),
  });
  return (
    <div role="toolbar" aria-label="Formatting" onKeyDown={onKeyDown}>
      {LABELS.map((label) => (
        <button key={label} type="button" data-item="" tabIndex={label === stop ? 0 : -1}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Page({ dir, initial }: { dir?: "rtl"; initial?: number }) {
  return (
    <div dir={dir}>
      <button type="button">Before</button>
      <Toolbar initial={initial} />
      <button type="button">After</button>
    </div>
  );
}

function button(name: string) {
  return screen.getByRole("button", { name });
}

describe("useRovingFocus in a real browser", () => {
  it("enters the group on its single tab stop and leaves it with one more Tab", async () => {
    render(<Page initial={1} />);
    button("Before").focus();

    await userEvent.tab();
    expect(button("Italic")).toHaveFocus();
    await userEvent.tab();
    expect(button("After")).toHaveFocus();
  });

  it("re-enters the group on the item the arrows last moved to", async () => {
    render(<Page />);
    button("Before").focus();

    await userEvent.tab();
    expect(button("Bold")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(button("Underline")).toHaveFocus();

    await userEvent.tab();
    expect(button("After")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(button("Underline")).toHaveFocus();
  });

  it("swaps the arrows under an inherited rtl direction", async () => {
    render(<Page dir="rtl" />);
    button("Before").focus();

    await userEvent.tab();
    expect(button("Bold")).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(button("Italic")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(button("Underline")).toHaveFocus();
  });
});
