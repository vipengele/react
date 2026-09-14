import type { IconComponent, IconComponentProps } from "@tandiko/icons";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button.js";

/** Stands in for a curated glyph: the component only ever forwards `className` to it. */
const Glyph =
  (testId: string): IconComponent =>
  ({ className }: IconComponentProps) => <svg data-testid={testId} className={className} />;

const Leading = Glyph("leading");
const Trailing = Glyph("trailing");

describe("Button", () => {
  it("renders a button carrying its children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("defaults to type=button, so a button inside a form doesn't submit it by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("lets a caller opt into submit behaviour", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("forwards arbitrary button attributes and handlers", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} data-testid="target">
        Save
      </Button>,
    );

    screen.getByTestId("target").click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders the primary variant at the medium size by default", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button").getAttribute("class")).toBe(
      "tandiko-button tandiko-button-primary tandiko-button-md",
    );
  });

  it.each(["primary", "secondary", "ghost", "danger"] as const)(
    "renders the %s variant class",
    (variant) => {
      render(<Button variant={variant}>Save</Button>);
      expect(screen.getByRole("button")).toHaveClass(`tandiko-button-${variant}`);
    },
  );

  it.each(["sm", "md", "lg"] as const)("renders the %s size class", (size) => {
    render(<Button size={size}>Save</Button>);
    expect(screen.getByRole("button")).toHaveClass(`tandiko-button-${size}`);
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Button className="custom">Save</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom");
    expect(button).toHaveClass("tandiko-button");
  });

  it("is enabled and not busy by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("passes a disabled flag through to the native attribute", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders no icons when none are given", () => {
    render(<Button>Save</Button>);
    expect(screen.queryByTestId("leading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trailing")).not.toBeInTheDocument();
  });

  it("renders a leading icon before the label", () => {
    render(<Button leadingIcon={Leading}>Save</Button>);
    const button = screen.getByRole("button");
    expect(screen.getByTestId("leading")).toHaveClass("tandiko-button-icon");
    expect(button.firstChild).toBe(screen.getByTestId("leading"));
  });

  it("renders a trailing icon after the label", () => {
    render(<Button trailingIcon={Trailing}>Save</Button>);
    const button = screen.getByRole("button");
    expect(screen.getByTestId("trailing")).toHaveClass("tandiko-button-icon");
    expect(button.lastChild).toBe(screen.getByTestId("trailing"));
  });

  it("renders both icons around the label", () => {
    render(
      <Button leadingIcon={Leading} trailingIcon={Trailing}>
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByTestId("leading")).toBeInTheDocument();
    expect(screen.getByTestId("trailing")).toBeInTheDocument();
  });

  describe("iconOnly", () => {
    it("adds the square class and takes its name from aria-label", () => {
      render(<Button iconOnly aria-label="Add item" leadingIcon={Leading} />);
      const button = screen.getByRole("button", { name: "Add item" });
      expect(button).toHaveClass("tandiko-button-icon-only");
    });

    it("carries no square class when not icon-only", () => {
      render(<Button>Save</Button>);
      expect(screen.getByRole("button")).not.toHaveClass("tandiko-button-icon-only");
    });
  });

  describe("loading", () => {
    it("swaps the visible content for a spinner", () => {
      render(<Button loading>Save</Button>);
      expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
    });

    it("hides the spinner from assistive technology", () => {
      render(<Button loading>Save</Button>);
      // Without this, the spinner's own aria-label would become the button's computed
      // accessible name instead of "Save", and every loading button would announce identically.
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("status", { hidden: true }).closest("[aria-hidden]")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });

    it("keeps the original label as the button's accessible name", () => {
      render(<Button loading>Save</Button>);
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("renders no hidden label span when the button has no children", () => {
      render(<Button loading iconOnly aria-label="Save" />);
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
      expect(document.querySelector(".tandiko-button-visually-hidden")).not.toBeInTheDocument();
    });

    it("withholds the icons while loading", () => {
      render(
        <Button loading leadingIcon={Leading} trailingIcon={Trailing}>
          Save
        </Button>,
      );
      expect(screen.queryByTestId("leading")).not.toBeInTheDocument();
      expect(screen.queryByTestId("trailing")).not.toBeInTheDocument();
    });

    it("disables interaction without a disabled prop", () => {
      render(<Button loading>Save</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("marks the button busy for assistive technology", () => {
      render(<Button loading>Save</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });

    it("sizes the spinner from the button's own size", () => {
      render(
        <Button size="lg" loading>
          Save
        </Button>,
      );
      expect(screen.getByRole("status", { hidden: true })).toHaveClass("tandiko-spinner-lg");
    });

    it("strokes the spinner in the button's own text colour", () => {
      // The spinner's stylesheet strokes it in `var(--tandiko-accent)`, which is invisible on a
      // primary button's accent background; both rules are single-class, so only the inline
      // override settles it deterministically.
      render(<Button loading>Save</Button>);
      expect(
        screen.getByRole("status", { hidden: true }).getAttribute("style")?.toLowerCase(),
      ).toContain("color: currentcolor");
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of buttons", () => {
      render(
        <>
          <Button>One</Button>
          <Button variant="ghost">Two</Button>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-button"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-button {");
    });

    it("takes the primary variant's colours from the accent custom properties", () => {
      render(<Button>Save</Button>);
      const style = document.head.querySelector('style[data-href="tandiko-button"]');
      expect(style?.textContent).toContain("background-color: var(--tandiko-accent);");
      expect(style?.textContent).toContain("color: var(--tandiko-accent-contrast);");
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      render(
        <Button variant="danger" size="lg" className="custom">
          Save
        </Button>,
      );
      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode entirely.
      expect(screen.getByRole("button").getAttribute("style")).toBeNull();
    });
  });
});
