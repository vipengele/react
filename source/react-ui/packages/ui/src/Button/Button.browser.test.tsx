import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { FormEvent, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { ButtonVariant } from "./Button.js";
import { Button } from "./Button.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one button.
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

/** Finishes the colour transition before reading it; a mid-transition read sees a blend. */
function settledStyle(element: Element): CSSStyleDeclaration {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
  return getComputedStyle(element);
}

describe("Button under a real ThemeProvider", () => {
  it("resolves --vpg-radius to the theme's literal value, proving the theme reached the browser", () => {
    render(
      <ThemeProvider>
        <Button>Save</Button>
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    const resolved = getComputedStyle(button).getPropertyValue("--vpg-radius").trim();
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

describe("a disabled Button in a real engine", () => {
  it("dispatches no click to the button or its ancestors", async () => {
    const onClick = vi.fn();
    const onWrapperClick = vi.fn();
    const { container } = renderThemed(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    container.addEventListener("click", onWrapperClick);

    await userEvent.click(screen.getByRole("button"), { force: true });

    expect(onClick).not.toHaveBeenCalled();
    expect(onWrapperClick).not.toHaveBeenCalled();
  });

  it("is skipped by the tab order", async () => {
    renderThemed(
      <>
        <Button disabled>Save</Button>
        <Button>Next</Button>
      </>,
    );

    await userEvent.tab();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
  });

  it("dims with a not-allowed cursor", () => {
    renderThemed(<Button disabled>Save</Button>);
    const style = settledStyle(screen.getByRole("button"));

    expect(style.opacity).toBe("0.55");
    expect(style.cursor).toBe("not-allowed");
  });
});

describe("a loading Button in a real engine", () => {
  it("is skipped by the tab order", async () => {
    renderThemed(
      <>
        <Button loading>Save</Button>
        <Button>Next</Button>
      </>,
    );

    await userEvent.tab();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
  });
});

describe("an aria-disabled Button in a real engine", () => {
  it("stays in the tab order", async () => {
    renderThemed(<Button aria-disabled>Save</Button>);

    await userEvent.tab();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));
  });

  it("dims with a not-allowed cursor, as native disabled does", () => {
    renderThemed(<Button aria-disabled>Save</Button>);
    const style = settledStyle(screen.getByRole("button"));

    expect(style.opacity).toBe("0.55");
    expect(style.cursor).toBe("not-allowed");
  });

  it("never runs onClick from a pointer click or keyboard activation", async () => {
    const onClick = vi.fn();
    renderThemed(
      <Button aria-disabled onClick={onClick}>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole("button"), { force: true });
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets the click propagate to ancestors", async () => {
    const onWrapperClick = vi.fn();
    const { container } = renderThemed(<Button aria-disabled>Save</Button>);
    container.addEventListener("click", onWrapperClick);

    await userEvent.click(screen.getByRole("button"), { force: true });

    expect(onWrapperClick).toHaveBeenCalledOnce();
  });

  it("does not submit its form from a click or Enter", async () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    renderThemed(
      <form onSubmit={onSubmit}>
        <Button type="submit" aria-disabled>
          Save
        </Button>
      </form>,
    );

    await userEvent.click(screen.getByRole("button"), { force: true });
    await userEvent.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(["primary", "secondary", "ghost", "danger"] as const)(
    "keeps the %s variant's resting background under hover",
    async (variant: ButtonVariant) => {
      renderThemed(
        <Button variant={variant} aria-disabled>
          Save
        </Button>,
      );
      const button = screen.getByRole("button");
      const rest = settledStyle(button).backgroundColor;

      await userEvent.hover(button, { force: true });

      expect(settledStyle(button).backgroundColor).toBe(rest);
    },
  );

  it.each(["primary", "secondary", "ghost", "danger"] as const)(
    "shifts the %s variant's background under hover when not disabled",
    async (variant: ButtonVariant) => {
      renderThemed(<Button variant={variant}>Save</Button>);
      const button = screen.getByRole("button");
      const rest = settledStyle(button).backgroundColor;

      await userEvent.hover(button);

      expect(settledStyle(button).backgroundColor).not.toBe(rest);
    },
  );
});
