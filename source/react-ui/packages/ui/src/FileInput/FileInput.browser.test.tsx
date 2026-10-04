import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

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

    const outline = getComputedStyle(wrapper);
    expect(outline.outlineStyle).toBe("none");
    expect(outline.outlineWidth).toBe("0px");
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
