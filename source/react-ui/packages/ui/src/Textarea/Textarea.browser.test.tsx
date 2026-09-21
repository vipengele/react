import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { TextField } from "../TextField/TextField.js";
import { Textarea } from "./Textarea.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and queries start matching more than one field.
afterEach(cleanup);

/** The size scale's default control step, which the shell takes as its floor, is 32px at the
 * default seed. Only a real engine resolves it: the token is a `calc()` over the seed, and its
 * value read back off a custom property is that expression, not a length. */
const CONTROL_STEP = 32;

/** Renders `ui` into a block container of a fixed width, under a real `ThemeProvider`. The width
 * is fixed so a click at a given x lands inside the control rather than wherever the page's own
 * width happens to put it. */
function renderInto(width: number, ui: ReactNode) {
  const { container } = render(
    <ThemeProvider>
      <div style={{ width: `${width}px` }}>{ui}</div>
    </ThemeProvider>,
  );
  return { container };
}

/** The bordered box: the element whose border and fill the user reads as the field. */
function shellOf(container: HTMLElement): HTMLElement {
  const shell = container.querySelector(".vpg-field-shell");
  expect(shell).not.toBeNull();
  return shell as HTMLElement;
}

/**
 * How many lines of text the control's content box holds, as a fraction of its own line height.
 * The control is `content-box`, so its padding is outside the height the `lh` bounds name and has
 * to come off a `clientHeight` reading before the two are comparable.
 */
function rowsShown(textarea: HTMLTextAreaElement): number {
  const styles = getComputedStyle(textarea);
  const content = textarea.clientHeight - Number.parseFloat(styles.paddingTop) - Number.parseFloat(styles.paddingBottom);
  return content / Number.parseFloat(styles.lineHeight);
}

function textareaOf(container: HTMLElement): HTMLTextAreaElement {
  return container.querySelector(".vpg-textarea") as HTMLTextAreaElement;
}

describe("Textarea under a real ThemeProvider", () => {
  // Every auto-growing case below is a claim about `field-sizing: content`, and an engine without
  // it renders a plain fixed-height textarea that satisfies several of them by accident. Asserted
  // rather than skipped over: a suite that quietly stops testing autogrow is worse than one that
  // fails.
  it("runs in an engine that resolves field-sizing", () => {
    expect(CSS.supports("field-sizing", "content")).toBe(true);
  });

  it("stands a one-row field at the size scale's control step", () => {
    const { container } = renderInto(
      300,
      <>
        <Textarea rows={1} aria-label="Note" />
        <TextField aria-label="Title" />
      </>,
    );

    // A single row of the default seed's text is shorter than the step, so the shell's floor is
    // what sets this height — and it sets the same one for both, which is what keeps a one-row
    // textarea and a text field level beside each other in a form.
    const [textareaShell, textFieldShell] = Array.from(container.querySelectorAll(".vpg-field-shell"));
    expect((textareaShell as HTMLElement).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
    expect((textFieldShell as HTMLElement).getBoundingClientRect().height).toBeCloseTo(CONTROL_STEP, 0);
  });

  it("takes the whole height of a shell taller than its text, so a click beside the first line focuses it", async () => {
    const { container } = renderInto(
      300,
      <Textarea rows={1} aria-label="Note" leading={<span style={{ display: "block", width: "16px", height: "60px" }} />} />,
    );
    const shell = shellOf(container);
    expect(shell.getBoundingClientRect().height).toBeGreaterThan(CONTROL_STEP);

    // Near the shell's top edge and clear of the leading slot: text sits at the top of the
    // control, but a control only as tall as its own text is centred in the shell, leaving a
    // strip above it where a click lands on the shell and focuses nothing.
    await userEvent.click(shell, { position: { x: 100, y: 4 } });

    expect(document.activeElement).toBe(textareaOf(container));
  });

  it("stands an empty auto-growing field at its rows", () => {
    const { container } = renderInto(300, <Textarea autoGrow rows={3} aria-label="Note" />);

    // `rows` is inert under `field-sizing: content` — an empty field tracks its one empty line —
    // so this height is the inline `min-height` in `lh` doing the work the attribute cannot.
    expect(rowsShown(textareaOf(container))).toBeCloseTo(3, 1);
  });

  it("grows an auto-growing field as lines are typed into it", async () => {
    const { container } = renderInto(300, <Textarea autoGrow rows={2} aria-label="Note" />);
    const textarea = textareaOf(container);
    const start = textarea.getBoundingClientRect().height;

    await userEvent.type(textarea, "one{Enter}two{Enter}three{Enter}four{Enter}five");

    expect(textarea.getBoundingClientRect().height).toBeGreaterThan(start);
    expect(rowsShown(textarea)).toBeCloseTo(5, 1);
  });

  it("leaves a fixed field at its rows however many lines it holds", () => {
    const { container } = renderInto(300, <Textarea rows={2} aria-label="Note" defaultValue={"one\ntwo\nthree\nfour\nfive"} />);

    expect(rowsShown(textareaOf(container))).toBeCloseTo(2, 1);
  });

  it("stops an auto-growing field at maxRows and scrolls the rest", () => {
    const { container } = renderInto(
      300,
      <Textarea autoGrow rows={2} maxRows={4} aria-label="Note" defaultValue={"one\ntwo\nthree\nfour\nfive\nsix\nseven"} />,
    );
    const textarea = textareaOf(container);

    expect(rowsShown(textarea)).toBeCloseTo(4, 1);
    // The lines past the cap are still there to be scrolled to, not clipped away.
    expect(textarea.scrollHeight).toBeGreaterThan(textarea.clientHeight);
  });

  it("gives a fixed field a vertical drag handle and an auto-growing one none", () => {
    const { container } = renderInto(
      300,
      <>
        <Textarea rows={2} aria-label="Fixed" />
        <Textarea autoGrow rows={2} aria-label="Growing" />
      </>,
    );

    const [fixed, growing] = Array.from(container.querySelectorAll(".vpg-textarea"));
    // A handle on a field that sizes itself from its content fights the next keystroke for the
    // height, and loses it.
    expect(getComputedStyle(fixed as HTMLElement).resize).toBe("vertical");
    expect(getComputedStyle(growing as HTMLElement).resize).toBe("none");
  });
});
