import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Card } from "./Card.js";

describe("Card", () => {
  it("renders Card.Header, Card.Content, and Card.Footer", () => {
    render(
      <Card>
        <Card.Header>Title</Card.Header>
        <Card.Content>Body</Card.Content>
        <Card.Footer>Actions</Card.Footer>
      </Card>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders with only Card.Content, its one required child", () => {
    render(
      <Card>
        <Card.Content>Body only</Card.Content>
      </Card>,
    );
    expect(screen.getByText("Body only")).toBeInTheDocument();
  });

  it("skips falsy children such as cond && <Card.Footer /> without treating them as invalid", () => {
    render(
      <Card>
        <Card.Content>Body</Card.Content>
        {false && <Card.Footer>Hidden</Card.Footer>}
        {null}
        {undefined}
      </Card>,
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("throws when Card.Content is missing", () => {
    expect(() =>
      render(
        <Card>
          <Card.Header>Title</Card.Header>
        </Card>,
      ),
    ).toThrow("Card requires a Card.Content child.");
  });

  it("throws on a second Card.Header", () => {
    expect(() =>
      render(
        <Card>
          <Card.Header>One</Card.Header>
          <Card.Header>Two</Card.Header>
          <Card.Content>Body</Card.Content>
        </Card>,
      ),
    ).toThrow("Card accepts at most one Card.Header child.");
  });

  it("throws on a second Card.Content", () => {
    expect(() =>
      render(
        <Card>
          <Card.Content>One</Card.Content>
          <Card.Content>Two</Card.Content>
        </Card>,
      ),
    ).toThrow("Card accepts at most one Card.Content child.");
  });

  it("throws on a second Card.Footer", () => {
    expect(() =>
      render(
        <Card>
          <Card.Content>Body</Card.Content>
          <Card.Footer>One</Card.Footer>
          <Card.Footer>Two</Card.Footer>
        </Card>,
      ),
    ).toThrow("Card accepts at most one Card.Footer child.");
  });

  it("throws on an arbitrary element child", () => {
    expect(() =>
      render(
        <Card>
          <Card.Content>Body</Card.Content>
          <div>Not a Card subcomponent</div>
        </Card>,
      ),
    ).toThrow("Card only accepts Card.Header, Card.Content, and Card.Footer as children.");
  });

  it("throws on a non-element, non-falsy child", () => {
    expect(() =>
      render(
        <Card>
          <Card.Content>Body</Card.Content>
          {"a stray string"}
        </Card>,
      ),
    ).toThrow("Card only accepts Card.Header, Card.Content, and Card.Footer as children.");
  });

  describe("non-interactive rendering", () => {
    it("renders a plain div with no button role when onClick is not given", () => {
      const { container } = render(
        <Card>
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      const card = container.querySelector(".tandiko-card");
      expect(card?.tagName).toBe("DIV");
      expect(card).not.toHaveAttribute("role");
      expect(card).not.toHaveAttribute("tabindex");
      expect(card).not.toHaveClass("tandiko-card-interactive");
    });
  });

  describe("interactive rendering", () => {
    it("renders role=button and tabIndex=0 when onClick is given", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      const card = screen.getByRole("button");
      expect(card).toHaveAttribute("tabindex", "0");
      expect(card).toHaveClass("tandiko-card-interactive");
    });

    it("calls onClick on a mouse click", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick on Enter", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick on Space", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: " " });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick on an unrelated key", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: "Tab" });
      expect(onClick).not.toHaveBeenCalled();
    });

    it("forwards a caller-supplied onKeyDown alongside its own handling", () => {
      const onClick = vi.fn();
      const onKeyDown = vi.fn();
      render(
        <Card onClick={onClick} onKeyDown={onKeyDown}>
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not activate the Card when a nested control is clicked", () => {
      const onClick = vi.fn();
      const onFooterClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>Body</Card.Content>
          <Card.Footer>
            <button type="button" onClick={onFooterClick}>
              Action
            </button>
          </Card.Footer>
        </Card>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Action" }));
      expect(onFooterClick).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    it("does not activate the Card on Enter pressed inside a nested link", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>Body</Card.Content>
          <Card.Footer>
            <a href="/somewhere">View pricing details</a>
          </Card.Footer>
        </Card>,
      );
      fireEvent.keyDown(screen.getByRole("link", { name: "View pricing details" }), { key: "Enter" });
      expect(onClick).not.toHaveBeenCalled();
    });

    it("does not activate the Card on Space typed into a nested input", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>
            <input aria-label="Note" />
          </Card.Content>
        </Card>,
      );
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Note" }), { key: " " });
      expect(onClick).not.toHaveBeenCalled();
    });

    it("still activates the Card when the click lands on a non-interactive descendant", () => {
      const onClick = vi.fn();
      render(
        <Card onClick={onClick}>
          <Card.Content>
            <span>Body</span>
          </Card.Content>
        </Card>,
      );
      fireEvent.click(screen.getByText("Body"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    const { container } = render(
      <Card className="custom">
        <Card.Content>Body</Card.Content>
      </Card>,
    );
    const card = container.querySelector(".tandiko-card");
    expect(card).toHaveClass("custom");
    expect(card).toHaveClass("tandiko-card");
  });

  it("forwards arbitrary attributes to the wrapping element", () => {
    render(
      <Card data-testid="target">
        <Card.Content>Body</Card.Content>
      </Card>,
    );
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  describe("subcomponents", () => {
    it("compose a caller-supplied className alongside their own classes", () => {
      render(
        <Card>
          <Card.Header className="header-custom">Title</Card.Header>
          <Card.Content className="content-custom">Body</Card.Content>
          <Card.Footer className="footer-custom">Actions</Card.Footer>
        </Card>,
      );
      expect(screen.getByText("Title")).toHaveClass("tandiko-card-header", "header-custom");
      expect(screen.getByText("Body")).toHaveClass("tandiko-card-content", "content-custom");
      expect(screen.getByText("Actions")).toHaveClass("tandiko-card-footer", "footer-custom");
    });

    it("forward arbitrary attributes on Card.Header, Card.Content and Card.Footer", () => {
      render(
        <Card>
          <Card.Header data-testid="header">Title</Card.Header>
          <Card.Content data-testid="content">Body</Card.Content>
          <Card.Footer data-testid="footer">Actions</Card.Footer>
        </Card>,
      );
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("content")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of cards", () => {
      render(
        <>
          <Card>
            <Card.Content>One</Card.Content>
          </Card>
          <Card>
            <Card.Content>Two</Card.Content>
          </Card>
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-card"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-card {");
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      const { container } = render(
        <Card className="custom">
          <Card.Content>Body</Card.Content>
        </Card>,
      );
      // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
      // same element, so this instance would stop adapting to colour mode entirely.
      expect(container.querySelector(".tandiko-card")?.getAttribute("style")).toBeNull();
    });
  });
});
