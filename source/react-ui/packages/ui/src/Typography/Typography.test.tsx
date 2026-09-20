import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TypographyColor, TypographyVariant, TypographyWeight } from "./Typography.js";
import { Typography } from "./Typography.js";

const VARIANT_TAG: Record<TypographyVariant, string> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  "body-lg": "p",
  "body-md": "p",
  "body-sm": "p",
  caption: "span",
};

describe("Typography", () => {
  it("renders its children", () => {
    render(<Typography>Hello</Typography>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("defaults to the body-md variant rendered as a paragraph", () => {
    render(<Typography>Hello</Typography>);
    const node = screen.getByText("Hello");
    expect(node.tagName).toBe("P");
    expect(node).toHaveClass("vpg-typography-body-md");
  });

  it.each(Object.entries(VARIANT_TAG) as [TypographyVariant, string][])(
    "renders the %s variant as a <%s> with its own class",
    (variant, tag) => {
      render(<Typography variant={variant}>Hello</Typography>);
      const node = screen.getByText("Hello");
      expect(node.tagName).toBe(tag.toUpperCase());
      expect(node).toHaveClass(`vpg-typography-${variant}`);
    },
  );

  it.each(["regular", "medium", "bold"] as const)("renders the %s weight class", (weight: TypographyWeight) => {
    render(<Typography weight={weight}>Hello</Typography>);
    expect(screen.getByText("Hello")).toHaveClass(`vpg-typography-weight-${weight}`);
  });

  it.each(["primary", "secondary", "subtle", "accent"] as const)("renders the %s color class", (color: TypographyColor) => {
    render(<Typography color={color}>Hello</Typography>);
    expect(screen.getByText("Hello")).toHaveClass(`vpg-typography-color-${color}`);
  });

  it("defaults to regular weight and primary color", () => {
    render(<Typography>Hello</Typography>);
    const node = screen.getByText("Hello");
    expect(node).toHaveClass("vpg-typography-weight-regular");
    expect(node).toHaveClass("vpg-typography-color-primary");
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Typography className="custom">Hello</Typography>);
    const node = screen.getByText("Hello");
    expect(node).toHaveClass("custom");
    expect(node).toHaveClass("vpg-typography");
  });

  describe("as", () => {
    it("overrides the rendered tag independently of the variant's styling", () => {
      render(
        <Typography variant="h1" as="div">
          Hello
        </Typography>,
      );
      const node = screen.getByText("Hello");
      expect(node.tagName).toBe("DIV");
      expect(node).toHaveClass("vpg-typography-h1");
    });

    it("forwards attributes belonging to the overriding element", () => {
      render(
        <Typography as="label" htmlFor="name">
          Name
        </Typography>,
      );
      expect(screen.getByText("Name")).toHaveAttribute("for", "name");
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of instances", () => {
      render(
        <>
          <Typography>One</Typography>
          <Typography variant="h2">Two</Typography>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-typography"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-typography {");
    });

    it("takes its colors from the ink custom properties", () => {
      render(<Typography>Hello</Typography>);
      const style = document.head.querySelector('style[data-href="vpg-typography"]');
      expect(style?.textContent).toContain("color: var(--vpg-ink);");
      expect(style?.textContent).toContain("color: var(--vpg-ink-muted);");
      expect(style?.textContent).toContain("color: var(--vpg-ink-subtle);");
      expect(style?.textContent).toContain("color: var(--vpg-accent);");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(
        <Typography variant="display" weight="bold" color="accent" className="custom">
          Hello
        </Typography>,
      );
      // An inline custom property would beat the base stylesheet's dark-mode reassignment on
      // the same element, so this instance would stop adapting to colour mode entirely.
      expect(screen.getByText("Hello").getAttribute("style")).toBeNull();
    });
  });
});
