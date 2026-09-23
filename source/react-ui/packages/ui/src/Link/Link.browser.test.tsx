import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import type { LinkTone } from "./Link.js";
import { Link } from "./Link.js";

/**
 * Every state the link draws is a `var()` the cascade resolves against the theme, which jsdom
 * never does. `:visited` is absent here on purpose: engines report an unvisited link's style to
 * script whatever its history, so no test can observe the visited colour.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one link.
afterEach(async () => {
  cleanup();
  // The pointer stays where the last test left it, and a hover carried into the next test's
  // first read reports the hover colour as the resting one.
  await userEvent.unhover(document.body);
});

/** Mounts `children` under a real provider, so every `--vpg-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

/** Resolves a token to the colour the engine computes for it inside the mounted root. */
function resolvedColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

/** Finishes the colour transition before reading it; a mid-transition read sees a blend. */
function settledStyle(element: Element): CSSStyleDeclaration {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
  return getComputedStyle(element);
}

describe.each(["accent", "danger"] as const)("a %s Link under a real ThemeProvider", (tone: LinkTone) => {
  function renderLink(): HTMLElement {
    renderThemed(
      <p>
        Read the{" "}
        <Link href="#docs" tone={tone}>
          docs
        </Link>{" "}
        first.
      </p>,
    );
    return screen.getByRole("link", { name: "docs" });
  }

  it("paints its text and underline in the tone at rest", () => {
    const style = settledStyle(renderLink());

    expect(style.color).toBe(resolvedColour(`--vpg-${tone}`));
    expect(style.textDecorationLine).toBe("underline");
  });

  it("shifts to the tone's hover colour under the pointer", async () => {
    const link = renderLink();
    const rest = settledStyle(link).color;

    await userEvent.hover(link);
    const hovered = settledStyle(link).color;

    expect(hovered).toBe(resolvedColour(`--vpg-${tone}-hover`));
    expect(hovered).not.toBe(rest);
  });

  it("draws the tone's focus ring when it takes keyboard focus", async () => {
    const link = renderLink();

    await userEvent.tab();

    expect(document.activeElement).toBe(link);
    const style = getComputedStyle(link);
    expect(style.outlineStyle).toBe("solid");
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.outlineColor).toBe(resolvedColour(`--vpg-${tone}-ring`));
  });
});

describe("Link typography", () => {
  it("inherits the font size and weight of the text it sits in", () => {
    renderThemed(
      <p style={{ fontSize: "22px", fontWeight: 700 }}>
        Read the <Link href="#docs">docs</Link>
      </p>,
    );
    const link = getComputedStyle(screen.getByRole("link"));

    expect(link.fontSize).toBe("22px");
    expect(link.fontWeight).toBe("700");
  });
});

describe("an external Link in a real engine", () => {
  function renderExternal(): HTMLElement {
    renderThemed(
      <p style={{ fontSize: "20px" }}>
        See{" "}
        <Link href="https://example.com" external>
          Example
        </Link>{" "}
        for more.
      </p>,
    );
    return screen.getByRole("link");
  }

  it("keeps opens-in-a-new-tab a separate word in the accessible name", () => {
    renderExternal();

    expect(screen.getByRole("link", { name: "Example opens in a new tab" })).toBeInTheDocument();
  });

  it("sizes the glyph to the surrounding text and keeps it on the link's line", () => {
    const link = renderExternal();
    const glyph = (link.querySelector("svg") as SVGElement).getBoundingClientRect();
    const text = link.getBoundingClientRect();

    expect(glyph.width).toBeGreaterThan(0);
    expect(glyph.width).toBeLessThanOrEqual(20);
    expect(glyph.top).toBeGreaterThanOrEqual(text.top - 1);
    expect(glyph.bottom).toBeLessThanOrEqual(text.bottom + 1);
  });

  it("takes no visual space for the hidden announcement", () => {
    const link = renderExternal();
    const hidden = (link.querySelector(".vpg-link-visually-hidden") as HTMLElement).getBoundingClientRect();

    expect(hidden.width).toBeLessThanOrEqual(1);
    expect(hidden.height).toBeLessThanOrEqual(1);
  });
});
