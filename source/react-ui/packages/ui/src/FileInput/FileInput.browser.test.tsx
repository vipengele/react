import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { FileInput } from "./FileInput.js";

/**
 * The file input's ring is drawn on its wrapper, not on the native `<input type="file">`: the input
 * is visually hidden down to a 1px clip, so an outline on it would be invisible. The wrapper finds
 * out its input has keyboard focus through `:has(> input:focus-visible)`, a relational selector
 * jsdom does not evaluate against real focus — only an engine that tracks focus-visible proves the
 * ring appears.
 */

const ringStylesheet = `
.vpg-file-input-host {
  --vpg-focus-ring-width: 3px;
  --vpg-focus-ring-offset: 2px;
  --vpg-accent-ring: rgb(10, 20, 30);
}

.vpg-file-input {
  display: inline-block;
}

.vpg-file-input:has(> input:focus-visible) {
  outline: var(--vpg-focus-ring-width) solid var(--vpg-accent-ring);
  outline-offset: var(--vpg-focus-ring-offset);
}

.vpg-file-input > input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

// The chromium project has no setup file, so nothing removes the mounted DOM between tests; without
// this a second mount leaves two inputs in the tab order and `tab()` lands on the stale one.
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  for (const style of document.head.querySelectorAll("style[data-test-file-input-ring]")) {
    style.remove();
  }
});

/** Mounts the ring stylesheet and a wrapper whose direct child is a visually-hidden file input. */
function mountWrapper(): { wrapper: HTMLElement; input: HTMLInputElement } {
  const style = document.createElement("style");
  style.setAttribute("data-test-file-input-ring", "");
  style.textContent = ringStylesheet;
  document.head.append(style);

  const host = document.createElement("div");
  host.className = "vpg-file-input-host";
  const wrapper = document.createElement("span");
  wrapper.className = "vpg-file-input";
  const input = document.createElement("input");
  input.type = "file";
  input.setAttribute("aria-label", "Upload");
  wrapper.append(input);
  host.append(wrapper);
  document.body.append(host);

  return { wrapper, input };
}

describe("the FileInput focus ring selector in a real engine", () => {
  it("draws no ring on the wrapper while the input is unfocused", () => {
    const { wrapper } = mountWrapper();

    // An outline whose style is `none` draws nothing, but engines differ on the width they report
    // for it (`0px`, or the `medium` default), so the unfocused state is read from the style alone.
    expect(getComputedStyle(wrapper).outlineStyle).toBe("none");
  });

  it("draws the ring on the wrapper when the hidden input takes keyboard focus", async () => {
    const { wrapper, input } = mountWrapper();

    await userEvent.tab();

    expect(document.activeElement).toBe(input);
    expect(input.matches(":focus-visible")).toBe(true);
    const outline = getComputedStyle(wrapper);
    expect(outline.outlineStyle).toBe("solid");
    expect(outline.outlineWidth).toBe("3px");
    expect(outline.outlineOffset).toBe("2px");
    expect(outline.outlineColor).toBe("rgb(10, 20, 30)");
  });

  it("removes the ring from the wrapper once the input loses focus", async () => {
    const { wrapper, input } = mountWrapper();

    await userEvent.tab();
    expect(getComputedStyle(wrapper).outlineStyle).toBe("solid");

    input.blur();

    expect(getComputedStyle(wrapper).outlineStyle).toBe("none");
  });
});

/** Resolves the ring the theme defines, read off a probe inside the mounted root. */
function themedRing(): { width: string; colour: string; offset: string } {
  const probe = document.createElement("span");
  probe.style.outline = "var(--vpg-focus-ring-width) solid var(--vpg-accent-ring)";
  probe.style.outlineOffset = "var(--vpg-focus-ring-offset)";
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const style = getComputedStyle(probe);
  const ring = { width: style.outlineWidth, colour: style.outlineColor, offset: style.outlineOffset };
  probe.remove();
  return ring;
}

/** Mounts the real component under a real provider, so its injected stylesheet and every `--vpg-*`
 * read it makes resolve the way they do for a consumer. */
function renderFileInput() {
  const { container } = render(
    <ThemeProvider>
      <FileInput aria-label="Attachments" upload={() => new Promise<unknown>(() => {})} />
    </ThemeProvider>,
  );
  const zone = container.querySelector(".vpg-file-input") as HTMLElement;
  const input = screen.getByLabelText("Attachments") as HTMLInputElement;
  return { zone, input };
}

describe("a mounted FileInput in a real engine", () => {
  it("draws the theme's ring on the zone, from its own stylesheet, when Tab reaches the input", async () => {
    const { zone, input } = renderFileInput();
    expect(getComputedStyle(zone).outlineStyle).toBe("none");

    await userEvent.tab();

    expect(document.activeElement).toBe(input);
    const ring = themedRing();
    expect(ring.width).not.toBe("0px");
    const outline = getComputedStyle(zone);
    expect(outline.outlineStyle).toBe("solid");
    expect(outline.outlineWidth).toBe(ring.width);
    expect(outline.outlineColor).toBe(ring.colour);
    expect(outline.outlineOffset).toBe(ring.offset);
  });

  it("clips the native input to 1px while the zone and its prompt take real space", () => {
    const { zone, input } = renderFileInput();

    const inputBox = input.getBoundingClientRect();
    expect(inputBox.width).toBe(1);
    expect(inputBox.height).toBe(1);

    const zoneBox = zone.getBoundingClientRect();
    expect(zoneBox.width).toBeGreaterThan(0);
    expect(zoneBox.height).toBeGreaterThan(inputBox.height);

    const prompt = screen.getByText("Drop files here, or click to choose");
    const promptBox = prompt.getBoundingClientRect();
    expect(promptBox.width).toBeGreaterThan(0);
    expect(promptBox.height).toBeGreaterThan(0);
    expect(zone.contains(prompt)).toBe(true);
  });
});
