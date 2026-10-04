import { fireEvent, render, screen, within } from "@testing-library/react";
import { type ComponentPropsWithoutRef, createRef, type Ref } from "react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs, type BreadcrumbsItem } from "./Breadcrumbs.js";

function trail(count: number): BreadcrumbsItem[] {
  return Array.from({ length: count }, (_, index) => ({ label: `Item ${index + 1}`, href: `/item-${index + 1}` }));
}

/** The trail's items in order, the collapse marker standing in as `…`. */
function labels(): string[] {
  return screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
}

function expandButton() {
  return screen.queryByRole("button", { name: "Show hidden path" });
}

interface RouterLinkProps extends Omit<ComponentPropsWithoutRef<"a">, "href"> {
  to: string;
  ref?: Ref<HTMLAnchorElement>;
}

/** Stands in for a router's link: takes `to` rather than `href` and attaches `ref` to its anchor. */
function RouterLink({ to, ref, children, ...rest }: RouterLinkProps) {
  return (
    <a ref={ref} href={`#${to}`} data-router="true" {...rest}>
      {children}
    </a>
  );
}

/** Stands in for a router's link that never attaches the `ref` it is given. */
function RefIgnoringLink({ to, ref: _ref, children, ...rest }: RouterLinkProps) {
  return (
    <a href={`#${to}`} {...rest}>
      {children}
    </a>
  );
}

describe("Breadcrumbs structure", () => {
  it("renders a labelled navigation landmark holding an ordered list", () => {
    render(<Breadcrumbs items={trail(3)} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("list").tagName).toBe("OL");
    expect(labels()).toEqual(["Item 1", "Item 2", "Item 3"]);
  });

  it("renders nothing for an empty trail", () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single item as the current page with no link", () => {
    render(<Breadcrumbs items={trail(1)} />);
    expect(screen.getByText("Item 1")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("links every item but the last and marks the last as the current page", () => {
    render(<Breadcrumbs items={trail(3)} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/item-1", "/item-2"]);
    expect(screen.getByText("Item 3")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Item 1")).not.toHaveAttribute("aria-current");
  });

  it("never links the last item even when it carries an href", () => {
    render(<Breadcrumbs items={trail(2)} />);
    expect(screen.queryByRole("link", { name: "Item 2" })).toBeNull();
    expect(screen.getByText("Item 2")).toHaveAttribute("aria-current", "page");
  });

  it("renders a mid-trail item without an href as plain text", () => {
    render(<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Section" }, { label: "Page" }]} />);
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Section" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("uses the label prop as the landmark's accessible name", () => {
    render(<Breadcrumbs items={trail(2)} label="You are here" />);
    expect(screen.getByRole("navigation", { name: "You are here" })).toBeInTheDocument();
  });

  it("composes a caller-supplied className alongside its own class", () => {
    render(<Breadcrumbs items={trail(2)} className="custom" />);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("vpg-breadcrumbs");
    expect(nav).toHaveClass("custom");
  });

  it("attaches ref to the nav", () => {
    const ref = createRef<HTMLElement>();
    render(<Breadcrumbs items={trail(2)} ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("navigation"));
  });

  it("forwards rest props to the nav", () => {
    render(<Breadcrumbs items={trail(2)} data-testid="target" id="crumbs" />);
    const nav = screen.getByTestId("target");
    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveAttribute("id", "crumbs");
  });
});

describe("Breadcrumbs collapse", () => {
  it("renders in full when the items do not exceed maxItems", () => {
    render(<Breadcrumbs items={trail(4)} />);
    expect(expandButton()).toBeNull();
    expect(labels()).toEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);
  });

  it("collapses the middle by default to 1 item before and 2 after the collapse marker", () => {
    render(<Breadcrumbs items={trail(6)} />);
    expect(labels()).toEqual(["Item 1", "…", "Item 5", "Item 6"]);
    expect(expandButton()).toBeInTheDocument();
  });

  it("honours custom maxItems, itemsBeforeCollapse and itemsAfterCollapse", () => {
    render(<Breadcrumbs items={trail(8)} maxItems={5} itemsBeforeCollapse={2} itemsAfterCollapse={3} />);
    expect(labels()).toEqual(["Item 1", "Item 2", "…", "Item 6", "Item 7", "Item 8"]);
  });

  it("renders in full when the leading and trailing counts leave nothing to hide", () => {
    render(<Breadcrumbs items={trail(5)} maxItems={2} itemsBeforeCollapse={2} itemsAfterCollapse={3} />);
    expect(expandButton()).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("clamps itemsAfterCollapse to at least 1 so the current page always shows", () => {
    render(<Breadcrumbs items={trail(6)} itemsAfterCollapse={0} />);
    expect(labels()).toEqual(["Item 1", "…", "Item 6"]);
  });

  it("clamps a negative itemsBeforeCollapse to 0", () => {
    render(<Breadcrumbs items={trail(6)} itemsBeforeCollapse={-3} />);
    expect(labels()).toEqual(["…", "Item 5", "Item 6"]);
  });

  it("names the collapse marker from expandLabel", () => {
    render(<Breadcrumbs items={trail(6)} expandLabel="Show the rest" />);
    expect(screen.getByRole("button", { name: "Show the rest" })).toBeInTheDocument();
  });

  it("expands the whole trail in place when the collapse marker is activated", () => {
    render(<Breadcrumbs items={trail(6)} />);
    fireEvent.click(expandButton() as HTMLElement);
    expect(expandButton()).toBeNull();
    expect(labels()).toEqual(["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6"]);
  });

  it("re-collapses when the items' contents change", () => {
    const { rerender } = render(<Breadcrumbs items={trail(6)} />);
    fireEvent.click(expandButton() as HTMLElement);
    expect(expandButton()).toBeNull();

    rerender(<Breadcrumbs items={trail(6).map((item) => ({ ...item, href: `${item.href}/next` }))} />);
    expect(expandButton()).toBeInTheDocument();
  });

  it("stays expanded across a rerender with identical contents in a new array", () => {
    const { rerender } = render(<Breadcrumbs items={trail(6)} />);
    fireEvent.click(expandButton() as HTMLElement);

    rerender(<Breadcrumbs items={trail(6)} />);
    expect(expandButton()).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });
});

describe("Breadcrumbs focus after expanding", () => {
  it("moves focus to the first revealed link", () => {
    render(<Breadcrumbs items={trail(6)} />);
    fireEvent.click(expandButton() as HTMLElement);
    expect(screen.getByRole("link", { name: "Item 2" })).toHaveFocus();
  });

  it("focuses the first revealed item that has an href when the first revealed has none", () => {
    const items: BreadcrumbsItem[] = [
      { label: "Home", href: "/" },
      { label: "Plain" },
      { label: "Linked", href: "/linked" },
      { label: "Four", href: "/four" },
      { label: "Five", href: "/five" },
      { label: "Page" },
    ];
    render(<Breadcrumbs items={items} />);
    fireEvent.click(expandButton() as HTMLElement);
    expect(screen.getByRole("link", { name: "Linked" })).toHaveFocus();
  });

  it("falls back to the first focusable element in the revealed range when the link's ref is never attached", () => {
    const items: BreadcrumbsItem<typeof RefIgnoringLink>[] = [
      { label: "Home", linkProps: { to: "/" } },
      { label: "Plain" },
      { label: "Linked", linkProps: { to: "/linked" } },
      { label: "Four", linkProps: { to: "/four" } },
      { label: "Five", linkProps: { to: "/five" } },
      { label: "Page" },
    ];
    const withHrefs = items.map((item, index) => (index === 1 || index === 5 ? item : { ...item, href: `/${index}` }));
    render(<Breadcrumbs linkAs={RefIgnoringLink} items={withHrefs} />);
    fireEvent.click(expandButton() as HTMLElement);
    expect(screen.getByRole("link", { name: "Linked" })).toHaveFocus();
  });

  it("falls back to the list when the revealed range holds nothing focusable", () => {
    const items: BreadcrumbsItem[] = [
      { label: "Home", href: "/" },
      { label: "Plain one" },
      { label: "Plain two" },
      { label: "Plain three" },
      { label: "Four", href: "/four" },
      { label: "Page" },
    ];
    render(<Breadcrumbs items={items} itemsAfterCollapse={2} />);
    fireEvent.click(expandButton() as HTMLElement);
    expect(screen.getByRole("list")).toHaveFocus();
  });

  it("does not move focus when the trail changes shape while already expanded", () => {
    const { rerender } = render(<Breadcrumbs items={trail(6)} />);
    fireEvent.click(expandButton() as HTMLElement);
    const link = screen.getByRole("link", { name: "Item 1" });
    link.focus();

    rerender(<Breadcrumbs items={trail(6)} itemsAfterCollapse={3} />);
    expect(link).toHaveFocus();
  });
});

describe("Breadcrumbs linkAs", () => {
  it("renders every link through linkAs with each item's linkProps", () => {
    const items = [
      { label: "Home", href: "/home", linkProps: { to: "/home", title: "Start" } },
      { label: "Docs", href: "/docs", linkProps: { to: "/docs" } },
      { label: "Page" },
    ];
    render(<Breadcrumbs linkAs={RouterLink} items={items} />);
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("data-router", "true");
    expect(home).toHaveAttribute("title", "Start");
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("data-router", "true");
    expect(screen.getByText("Page")).not.toHaveAttribute("data-router");
  });

  it("keeps the first-revealed focus working when linkAs attaches the ref", () => {
    const items = trail(6).map((item) => ({ ...item, linkProps: { to: item.href as string } }));
    render(<Breadcrumbs linkAs={RouterLink} items={items} />);
    fireEvent.click(expandButton() as HTMLElement);
    expect(screen.getByRole("link", { name: "Item 2" })).toHaveFocus();
  });
});
