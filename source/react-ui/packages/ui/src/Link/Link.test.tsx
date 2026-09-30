import { render, screen } from "@testing-library/react";
import { type ComponentPropsWithoutRef, createRef, type Ref } from "react";
import { describe, expect, it } from "vitest";
import { Link } from "./Link.js";

interface RouterLinkProps extends Omit<ComponentPropsWithoutRef<"a">, "href"> {
  to: string;
  ref?: Ref<HTMLAnchorElement>;
}

/** Stands in for a router's link: takes a `to` rather than an `href` and passes everything else
 * through to the anchor it renders, the way router link components do. */
function RouterLink({ to, ref, children, ...rest }: RouterLinkProps) {
  return (
    <a ref={ref} href={`#${to}`} data-router="true" {...rest}>
      {children}
    </a>
  );
}

describe("Link", () => {
  it("renders an anchor carrying its href and children", () => {
    render(<Link href="/docs">Docs</Link>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/docs");
  });

  it("uses the accent tone by default", () => {
    render(<Link href="/docs">Docs</Link>);
    expect(screen.getByRole("link").getAttribute("class")).toBe("vpg-link vpg-link-accent");
  });

  it("renders the danger tone class", () => {
    render(
      <Link href="/delete" tone="danger">
        Delete
      </Link>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("vpg-link-danger");
    expect(link).not.toHaveClass("vpg-link-accent");
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(
      <Link href="/docs" className="custom">
        Docs
      </Link>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("custom");
    expect(link).toHaveClass("vpg-link");
  });

  it("forwards arbitrary anchor attributes", () => {
    render(
      <Link href="/docs" data-testid="target" hrefLang="en">
        Docs
      </Link>,
    );
    expect(screen.getByTestId("target")).toHaveAttribute("hreflang", "en");
  });

  it("forwards its ref to the anchor", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link href="/docs" ref={ref}>
        Docs
      </Link>,
    );
    expect(ref.current).toBe(screen.getByRole("link"));
  });

  describe("internal", () => {
    it("sets no target or rel and renders no glyph or hidden text", () => {
      render(<Link href="/docs">Docs</Link>);
      const link = screen.getByRole("link", { name: "Docs" });
      expect(link).not.toHaveAttribute("target");
      expect(link).not.toHaveAttribute("rel");
      expect(link.querySelector("svg")).toBeNull();
      expect(link.querySelector(".vpg-link-visually-hidden")).toBeNull();
    });
  });

  describe("external", () => {
    it("opens in a new tab without handing the opener to the destination", () => {
      render(
        <Link href="https://example.com" external>
          Example
        </Link>,
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders the external-link glyph hidden from assistive technology", () => {
      render(
        <Link href="https://example.com" external>
          Example
        </Link>,
      );
      const glyph = screen.getByRole("link").querySelector("svg");
      expect(glyph).toHaveClass("vpg-link-icon");
      expect(glyph).toHaveAttribute("aria-hidden", "true");
    });

    it("announces that the link opens in a new tab as part of its accessible name", () => {
      render(
        <Link href="https://example.com" external>
          Example
        </Link>,
      );
      expect(screen.getByRole("link", { name: "Example opens in a new tab" })).toBeInTheDocument();
      expect(screen.getByText("opens in a new tab")).toHaveClass("vpg-link-visually-hidden");
    });

    it("lets an explicit target or rel win over the defaults", () => {
      render(
        <Link href="https://example.com" external target="docs" rel="noopener">
          Example
        </Link>,
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("target", "docs");
      expect(link).toHaveAttribute("rel", "noopener");
    });
  });

  describe("as", () => {
    it("renders a foreign link component, forwarding its own props and the link styling", () => {
      render(
        <Link as={RouterLink} to="settings">
          Settings
        </Link>,
      );
      const link = screen.getByRole("link", { name: "Settings" });
      expect(link).toHaveAttribute("data-router", "true");
      expect(link).toHaveAttribute("href", "#settings");
      expect(link).toHaveClass("vpg-link", "vpg-link-accent");
    });

    it("passes the external attributes through to the foreign component", () => {
      render(
        <Link as={RouterLink} to="settings" external>
          Settings
        </Link>,
      );
      const link = screen.getByRole("link", { name: "Settings opens in a new tab" });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("forwards its ref through the foreign component", () => {
      const ref = createRef<HTMLAnchorElement>();
      render(
        <Link as={RouterLink} to="settings" ref={ref}>
          Settings
        </Link>,
      );
      expect(ref.current).toBe(screen.getByRole("link"));
    });

    it("renders a native element other than an anchor", () => {
      render(
        <Link as="button" type="button">
          Show more
        </Link>,
      );
      expect(screen.getByRole("button", { name: "Show more" })).toHaveClass("vpg-link");
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of instances", () => {
      render(
        <>
          <Link href="/one">One</Link>
          <Link href="/two" tone="danger">
            Two
          </Link>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-link"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-link {");
    });

    it.each(["accent", "danger"] as const)("reads every %s state from its own ramp", (tone) => {
      render(<Link href="/docs">Docs</Link>);
      const css = document.head.querySelector('style[data-href="vpg-link"]')?.textContent;
      expect(css).toContain(`color: var(--vpg-${tone});`);
      expect(css).toContain(`color: var(--vpg-${tone}-visited);`);
      expect(css).toContain(`color: var(--vpg-${tone}-hover);`);
      expect(css).toContain(`solid var(--vpg-${tone}-ring);`);
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(
        <Link href="https://example.com" tone="danger" external className="custom">
          Example
        </Link>,
      );
      expect(screen.getByRole("link").getAttribute("style")).toBeNull();
    });
  });
});
