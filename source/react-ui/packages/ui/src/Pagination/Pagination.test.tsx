import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DropdownProps } from "../Dropdown/Dropdown.js";
import { Pagination, type PaginationProps } from "./Pagination.js";

/** The props the page-size field last rendered with. `Dropdown`'s single-selection `onChange` is
 * typed to report `null` as well as an option, which the field never offers a way to produce;
 * reading the handler off the props is how a test hands it one. */
const dropdownProps = vi.hoisted(() => ({ current: null as DropdownProps | null }));

// A pass-through: the real `Dropdown` renders and behaves exactly as it does unwrapped, so every
// test here drives the real control. The wrapper only records the props it was given.
vi.mock("../Dropdown/Dropdown.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../Dropdown/Dropdown.js")>();
  const { createElement } = await import("react");
  const Recording = Object.assign(
    (props: DropdownProps) => {
      dropdownProps.current = props;
      return createElement(actual.Dropdown, props);
    },
    { Option: actual.Dropdown.Option },
  );
  return { ...actual, Dropdown: Recording };
});

function renderPagination(props: Partial<PaginationProps> = {}) {
  return render(<Pagination totalItems={100} {...props} />);
}

function nav(): HTMLElement {
  return screen.getByRole("navigation");
}

function statusText(): string | null {
  return screen.getByRole("status").textContent;
}

/** The numbered bar as a reader sees it: page numbers, and `"…"` for each ellipsis. The step
 * buttons carry no text, so they drop out. */
function bar(): (number | string)[] {
  const items = Array.from(document.querySelectorAll(".vpg-pagination-list > li"));
  return items.flatMap((item): (number | string)[] => {
    if (item.getAttribute("aria-hidden") === "true") return ["…"];
    const text = item.textContent ?? "";
    return text === "" ? [] : [Number(text)];
  });
}

function currentPage(): HTMLElement {
  const current = document.querySelectorAll("[aria-current]");
  expect(current).toHaveLength(1);
  return current[0] as HTMLElement;
}

function button(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

function sizeField(): HTMLElement {
  return screen.getByRole("combobox");
}

/** Opens the page-size field and picks the option labelled `size`. */
function pickPageSize(size: number) {
  fireEvent.click(sizeField());
  fireEvent.click(screen.getByRole("option", { name: String(size) }));
}

describe("Pagination", () => {
  describe("structure and accessibility", () => {
    it("renders a navigation landmark named Pagination by default", () => {
      renderPagination();
      expect(nav().tagName).toBe("NAV");
      expect(nav()).toHaveAttribute("aria-label", "Pagination");
      expect(nav()).toHaveClass("vpg-pagination");
    });

    it("injects one stylesheet keyed by href and precedence however many bars render", () => {
      render(
        <>
          <Pagination totalItems={10} />
          <Pagination totalItems={20} aria-label="Second" />
        </>,
      );
      const sheets = document.querySelectorAll("style[data-href='vpg-pagination']");
      expect(sheets).toHaveLength(1);
      expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-pagination");
      expect(sheets[0]?.textContent).toContain(".vpg-pagination-list");
    });

    it("announces the range in view through a status element", () => {
      renderPagination();
      const status = screen.getByRole("status");
      expect(status).toHaveClass("vpg-pagination-status");
      expect(status).toHaveTextContent("1–10 of 100");
    });

    it("renders first, previous, numbered, next and last buttons in a list, in that order", () => {
      renderPagination();
      const list = screen.getByRole("list");
      expect(list).toHaveClass("vpg-pagination-list");
      const names = within(list)
        .getAllByRole("button")
        .map((node) => node.getAttribute("aria-label"));
      expect(names).toEqual([
        "First page",
        "Previous page",
        "Page 1",
        "Page 2",
        "Page 3",
        "Page 4",
        "Page 5",
        "Page 10",
        "Next page",
        "Last page",
      ]);
      for (const node of within(list).getAllByRole("button")) {
        expect(node).toHaveAttribute("type", "button");
        expect(node).toHaveClass("vpg-pagination-button");
      }
    });

    it("hides the step buttons' glyphs from assistive technology", () => {
      renderPagination();
      for (const name of ["First page", "Previous page", "Next page", "Last page"]) {
        const glyph = button(name).querySelector("svg");
        expect(glyph).toHaveClass("vpg-pagination-icon");
        expect(glyph).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("marks only the current page with aria-current=page", () => {
      renderPagination({ defaultPage: 3 });
      expect(currentPage()).toBe(button("Page 3"));
      expect(currentPage()).toHaveAttribute("aria-current", "page");
      for (const name of ["Page 1", "Page 2", "Page 4", "Page 10"]) {
        expect(button(name)).not.toHaveAttribute("aria-current");
      }
    });

    it("hides each ellipsis from assistive technology", () => {
      renderPagination({ totalItems: 200, defaultPage: 10 });
      expect(bar()).toEqual([1, "…", 9, 10, 11, "…", 20]);
      const ellipses = document.querySelectorAll(".vpg-pagination-ellipsis");
      expect(ellipses).toHaveLength(2);
      for (const ellipsis of ellipses) {
        expect(ellipsis.parentElement).toHaveAttribute("aria-hidden", "true");
        expect(ellipsis.querySelector("svg")).toHaveClass("vpg-pagination-icon");
      }
    });

    it("disables first and previous on the first page only", () => {
      renderPagination();
      expect(button("First page")).toBeDisabled();
      expect(button("Previous page")).toBeDisabled();
      expect(button("Next page")).toBeEnabled();
      expect(button("Last page")).toBeEnabled();
    });

    it("disables next and last on the last page only", () => {
      renderPagination({ defaultPage: 10 });
      expect(button("First page")).toBeEnabled();
      expect(button("Previous page")).toBeEnabled();
      expect(button("Next page")).toBeDisabled();
      expect(button("Last page")).toBeDisabled();
    });

    it("enables every step button on a page in the middle", () => {
      renderPagination({ defaultPage: 5 });
      for (const name of ["First page", "Previous page", "Next page", "Last page"]) {
        expect(button(name)).toBeEnabled();
      }
    });

    it("names the page-size field by its visible label", () => {
      renderPagination();
      const label = screen.getByText("Items per page");
      expect(label).toHaveClass("vpg-pagination-size-label");
      expect(label.id).not.toBe("");
      expect(sizeField()).toHaveAttribute("aria-labelledby", label.id);
      expect(screen.getByRole("combobox", { name: "Items per page" })).toBe(sizeField());
    });

    it("gives each bar's page-size label its own id", () => {
      render(
        <>
          <Pagination totalItems={10} aria-label="One" />
          <Pagination totalItems={10} aria-label="Two" />
        </>,
      );
      const [first, second] = screen.getAllByRole("combobox");
      expect(first?.getAttribute("aria-labelledby")).not.toBe(second?.getAttribute("aria-labelledby"));
    });
  });

  describe("pass-through to the nav", () => {
    it("forwards ref, className, style and native attributes", () => {
      const ref = createRef<HTMLElement>();
      renderPagination({ ref, className: "custom", style: { marginTop: "4px" }, id: "pager", title: "Pages" });
      const node = nav();
      expect(ref.current).toBe(node);
      expect(node.getAttribute("class")).toBe("vpg-pagination custom");
      expect(node).toHaveStyle({ marginTop: "4px" });
      expect(node).toHaveAttribute("id", "pager");
      expect(node).toHaveAttribute("title", "Pages");
    });

    it("carries data attributes", () => {
      render(<Pagination totalItems={10} data-testid="pager" />);
      expect(screen.getByTestId("pager")).toBe(nav());
    });

    it("renders only its own class without a className", () => {
      renderPagination();
      expect(nav().getAttribute("class")).toBe("vpg-pagination");
    });
  });

  describe("label overrides", () => {
    it("uses every override in place of its English default", () => {
      render(
        <Pagination
          totalItems={100}
          defaultPage={2}
          aria-label="Seiten"
          firstPageLabel="Erste Seite"
          previousPageLabel="Vorherige Seite"
          nextPageLabel="Nächste Seite"
          lastPageLabel="Letzte Seite"
          pageLabel={(page) => `Seite ${page}`}
          pageSizeLabel="Pro Seite"
          rangeLabel={({ from, to, total }) => `${from} bis ${to} von ${total}`}
        />,
      );
      expect(screen.getByRole("navigation", { name: "Seiten" })).toBe(nav());
      for (const name of ["Erste Seite", "Vorherige Seite", "Nächste Seite", "Letzte Seite", "Seite 1", "Seite 2", "Seite 10"]) {
        expect(button(name)).toBeInTheDocument();
      }
      expect(screen.getByRole("combobox", { name: "Pro Seite" })).toBe(sizeField());
      expect(screen.getByText("Pro Seite")).toBeInTheDocument();
      expect(statusText()).toBe("11 bis 20 von 100");
    });

    it("passes the range in view to rangeLabel", () => {
      const rangeLabel = vi.fn(() => "range");
      renderPagination({ totalItems: 95, defaultPage: 10, rangeLabel });
      expect(rangeLabel).toHaveBeenCalledWith({ from: 91, to: 95, total: 95 });
      expect(statusText()).toBe("range");
    });

    it("shows emptyLabel when there are no items", () => {
      renderPagination({ totalItems: 0, emptyLabel: "Keine Einträge" });
      expect(statusText()).toBe("Keine Einträge");
    });
  });

  describe("item counts", () => {
    it("shows the default empty label and page 1 of 1 with no items", () => {
      const rangeLabel = vi.fn(() => "range");
      renderPagination({ totalItems: 0, rangeLabel });
      expect(statusText()).toBe("No items");
      expect(rangeLabel).not.toHaveBeenCalled();
      expect(bar()).toEqual([1]);
      expect(currentPage()).toBe(button("Page 1"));
      for (const name of ["First page", "Previous page", "Next page", "Last page"]) {
        expect(button(name)).toBeDisabled();
      }
    });

    it.each([-5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("reads a total of %s as no items", (totalItems) => {
      renderPagination({ totalItems });
      expect(statusText()).toBe("No items");
      expect(bar()).toEqual([1]);
    });

    it("shows the single item on page 1 of 1", () => {
      renderPagination({ totalItems: 1 });
      expect(statusText()).toBe("1–1 of 1");
      expect(bar()).toEqual([1]);
      expect(button("Next page")).toBeDisabled();
      expect(button("Last page")).toBeDisabled();
    });

    it("floors a fractional total", () => {
      renderPagination({ totalItems: 20.9, defaultPage: 2 });
      expect(statusText()).toBe("11–20 of 20");
      expect(bar()).toEqual([1, 2]);
    });

    it("windows many pages with an ellipsis for each run left out", () => {
      renderPagination({ totalItems: 1000 });
      expect(bar()).toEqual([1, 2, 3, 4, 5, "…", 100]);
      fireEvent.click(button("Page 5"));
      expect(bar()).toEqual([1, "…", 4, 5, 6, "…", 100]);
      fireEvent.click(button("Last page"));
      expect(bar()).toEqual([1, "…", 96, 97, 98, 99, 100]);
      expect(statusText()).toBe("991–1000 of 1000");
    });

    it("ends the last page's range at the total", () => {
      renderPagination({ totalItems: 23, defaultPage: 3 });
      expect(statusText()).toBe("21–23 of 23");
    });
  });

  describe("siblings", () => {
    it("shows one page either side of the current one by default", () => {
      renderPagination({ totalItems: 200, defaultPage: 10 });
      expect(bar()).toEqual([1, "…", 9, 10, 11, "…", 20]);
    });

    it("shows only the current page between the ellipses with no siblings", () => {
      renderPagination({ totalItems: 200, defaultPage: 10, siblings: 0 });
      expect(bar()).toEqual([1, "…", 10, "…", 20]);
    });

    it("shows two pages either side with two siblings", () => {
      renderPagination({ totalItems: 200, defaultPage: 10, siblings: 2 });
      expect(bar()).toEqual([1, "…", 8, 9, 10, 11, 12, "…", 20]);
    });
  });

  describe("uncontrolled page", () => {
    it("starts on page 1 by default", () => {
      renderPagination();
      expect(currentPage()).toBe(button("Page 1"));
      expect(statusText()).toBe("1–10 of 100");
    });

    it("starts on defaultPage", () => {
      renderPagination({ defaultPage: 4 });
      expect(currentPage()).toBe(button("Page 4"));
      expect(statusText()).toBe("31–40 of 100");
    });

    it("moves with each button and reports every move", () => {
      const onPageChange = vi.fn();
      renderPagination({ onPageChange });

      fireEvent.click(button("Page 3"));
      expect(currentPage()).toBe(button("Page 3"));
      fireEvent.click(button("Next page"));
      expect(currentPage()).toBe(button("Page 4"));
      fireEvent.click(button("Previous page"));
      expect(currentPage()).toBe(button("Page 3"));
      fireEvent.click(button("Last page"));
      expect(currentPage()).toBe(button("Page 10"));
      fireEvent.click(button("First page"));
      expect(currentPage()).toBe(button("Page 1"));

      expect(onPageChange.mock.calls).toEqual([[3], [4], [3], [10], [1]]);
    });

    it("moves without an onPageChange", () => {
      renderPagination();
      fireEvent.click(button("Next page"));
      expect(statusText()).toBe("11–20 of 100");
    });

    it("reports nothing when the current page's button is pressed", () => {
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      renderPagination({ defaultPage: 2, onPageChange, onPageSizeChange });
      fireEvent.click(button("Page 2"));
      expect(onPageChange).not.toHaveBeenCalled();
      expect(onPageSizeChange).not.toHaveBeenCalled();
      expect(currentPage()).toBe(button("Page 2"));
    });
  });

  describe("controlled page", () => {
    it("shows the page it is given and reports moves without making them", () => {
      const onPageChange = vi.fn();
      renderPagination({ page: 3, onPageChange });
      expect(currentPage()).toBe(button("Page 3"));

      fireEvent.click(button("Next page"));
      expect(onPageChange).toHaveBeenLastCalledWith(4);
      expect(currentPage()).toBe(button("Page 3"));
    });

    it("follows a parent that applies each reported page", () => {
      const onPageChange = vi.fn();
      function Parent() {
        const [page, setPage] = useState(1);
        return (
          <Pagination
            totalItems={100}
            page={page}
            onPageChange={(next) => {
              onPageChange(next);
              setPage(next);
            }}
          />
        );
      }
      render(<Parent />);
      fireEvent.click(button("Page 5"));
      fireEvent.click(button("Next page"));
      expect(currentPage()).toBe(button("Page 6"));
      expect(onPageChange.mock.calls).toEqual([[5], [6]]);
    });

    it("ignores defaultPage while controlled", () => {
      renderPagination({ page: 2, defaultPage: 7 });
      expect(currentPage()).toBe(button("Page 2"));
    });
  });

  describe("clamping the page shown", () => {
    it.each([
      ["too large", 99, 10],
      ["zero", 0, 1],
      ["negative", -3, 1],
      ["NaN", Number.NaN, 1],
      ["fractional", 2.7, 2],
    ])("clamps a controlled page that is %s into range without reporting it", (_case, page, shown) => {
      const onPageChange = vi.fn();
      renderPagination({ page, onPageChange });
      expect(currentPage()).toBe(button(`Page ${shown}`));
      expect(statusText()).toBe(`${(shown - 1) * 10 + 1}–${shown * 10} of 100`);
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("clamps an out-of-range defaultPage into range without reporting it", () => {
      const onPageChange = vi.fn();
      renderPagination({ defaultPage: 50, onPageChange });
      expect(currentPage()).toBe(button("Page 10"));
      expect(button("Next page")).toBeDisabled();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("steps from the clamped page, not the raw one", () => {
      const onPageChange = vi.fn();
      renderPagination({ page: 99, onPageChange });
      fireEvent.click(button("Previous page"));
      expect(onPageChange.mock.calls).toEqual([[9]]);
    });

    it("re-clamps an uncontrolled page when the total shrinks, reporting nothing until the user acts", () => {
      const onPageChange = vi.fn();
      const { rerender } = render(<Pagination totalItems={100} defaultPage={10} onPageChange={onPageChange} />);
      rerender(<Pagination totalItems={30} defaultPage={10} onPageChange={onPageChange} />);
      expect(currentPage()).toBe(button("Page 3"));
      expect(onPageChange).not.toHaveBeenCalled();

      fireEvent.click(button("Previous page"));
      expect(onPageChange.mock.calls).toEqual([[2]]);
    });

    it("leaves a parent that ignores every callback with exactly the calls its clicks made", () => {
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      function Parent({ totalItems }: { totalItems: number }) {
        return (
          <Pagination totalItems={totalItems} page={40} pageSize={10} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
        );
      }
      const { rerender } = render(<Parent totalItems={100} />);
      rerender(<Parent totalItems={50} />);
      expect(onPageChange).not.toHaveBeenCalled();
      expect(onPageSizeChange).not.toHaveBeenCalled();

      fireEvent.click(button("First page"));
      fireEvent.click(button("First page"));
      expect(onPageChange.mock.calls).toEqual([[1], [1]]);
      expect(currentPage()).toBe(button("Page 5"));
      expect(onPageSizeChange).not.toHaveBeenCalled();
    });
  });

  describe("page size", () => {
    it("defaults to the first page-size option, offering 10, 20 and 50", () => {
      renderPagination();
      expect(sizeField()).toHaveTextContent("10");
      fireEvent.click(sizeField());
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["10", "20", "50"]);
      expect(screen.getByRole("option", { name: "10" })).toHaveAttribute("aria-selected", "true");
    });

    it("defaults to the first of custom pageSizeOptions", () => {
      renderPagination({ pageSizeOptions: [25, 5] });
      expect(sizeField()).toHaveTextContent("25");
      expect(statusText()).toBe("1–25 of 100");
    });

    it("starts at defaultPageSize over the first option", () => {
      renderPagination({ defaultPageSize: 20 });
      expect(sizeField()).toHaveTextContent("20");
      expect(statusText()).toBe("1–20 of 100");
      expect(bar()).toEqual([1, 2, 3, 4, 5]);
    });

    it("wraps the field and its label in a sized box with the control class on the dropdown", () => {
      const { container } = renderPagination();
      const box = container.querySelector(".vpg-pagination-size");
      expect(box).toContainElement(screen.getByText("Items per page"));
      expect(box?.querySelector(".vpg-pagination-size-control")).toContainElement(sizeField());
    });

    it("reports the picked size as a number, then the page holding the first item in view", () => {
      const calls: [string, unknown][] = [];
      renderPagination({
        defaultPage: 3,
        onPageSizeChange: (size) => calls.push(["size", size]),
        onPageChange: (page) => calls.push(["page", page]),
      });
      pickPageSize(20);

      // Item 21 opened page 3 at 10 per page; at 20 per page it sits on page 2.
      expect(calls).toEqual([
        ["size", 20],
        ["page", 2],
      ]);
      expect(typeof calls[0]?.[1]).toBe("number");
      expect(sizeField()).toHaveTextContent("20");
      expect(currentPage()).toBe(button("Page 2"));
      expect(statusText()).toBe("21–40 of 100");
    });

    it.each([
      [5, 10, 50, 1],
      [5, 10, 20, 3],
      [2, 50, 10, 6],
      [10, 10, 20, 5],
    ])("from page %i at %i per page, moves to the page holding its first item at %i per page", (page, from, to, expected) => {
      const onPageChange = vi.fn();
      renderPagination({ totalItems: 100, defaultPage: page, defaultPageSize: from, onPageChange });
      pickPageSize(to);
      expect(currentPage()).toBe(button(`Page ${expected}`));
      expect(onPageChange.mock.calls).toEqual([[expected]]);
    });

    it("reports no page change when the first item stays on the page shown", () => {
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      renderPagination({ onPageChange, onPageSizeChange });
      pickPageSize(50);
      expect(onPageSizeChange.mock.calls).toEqual([[50]]);
      expect(onPageChange).not.toHaveBeenCalled();
      expect(currentPage()).toBe(button("Page 1"));
    });

    it("reports nothing when the size already in force is picked again", () => {
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      renderPagination({ defaultPage: 4, onPageChange, onPageSizeChange });
      pickPageSize(10);
      expect(onPageSizeChange).not.toHaveBeenCalled();
      expect(onPageChange).not.toHaveBeenCalled();
      expect(currentPage()).toBe(button("Page 4"));
    });

    it("keeps the first item of a clamped page in view", () => {
      const onPageChange = vi.fn();
      renderPagination({ totalItems: 50, page: 99, onPageChange });
      pickPageSize(20);
      // The page shown is 5, opened by item 41, which sits on page 3 at 20 per page.
      expect(onPageChange.mock.calls).toEqual([[3]]);
    });

    it("ignores an emptied selection from the page-size field", () => {
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      renderPagination({ defaultPage: 3, onPageChange, onPageSizeChange });
      const onChange = dropdownProps.current?.onChange as ((value: null) => void) | undefined;
      expect(onChange).toBeTypeOf("function");

      act(() => onChange?.(null));
      expect(onPageSizeChange).not.toHaveBeenCalled();
      expect(onPageChange).not.toHaveBeenCalled();
      expect(sizeField()).toHaveTextContent("10");
      expect(currentPage()).toBe(button("Page 3"));
    });

    it("changes size without either callback", () => {
      renderPagination({ defaultPage: 3 });
      pickPageSize(50);
      expect(statusText()).toBe("1–50 of 100");
    });

    it("shows a controlled size and reports picks without applying them", () => {
      const onPageSizeChange = vi.fn();
      const onPageChange = vi.fn();
      renderPagination({ pageSize: 20, defaultPageSize: 50, page: 3, onPageSizeChange, onPageChange });
      expect(sizeField()).toHaveTextContent("20");
      expect(statusText()).toBe("41–60 of 100");

      pickPageSize(50);
      expect(onPageSizeChange.mock.calls).toEqual([[50]]);
      expect(onPageChange.mock.calls).toEqual([[1]]);
      expect(sizeField()).toHaveTextContent("20");
      expect(statusText()).toBe("41–60 of 100");
    });

    it("follows a parent that applies each reported size", () => {
      function Parent() {
        const [pageSize, setPageSize] = useState(10);
        return <Pagination totalItems={100} pageSize={pageSize} onPageSizeChange={setPageSize} />;
      }
      render(<Parent />);
      pickPageSize(20);
      expect(sizeField()).toHaveTextContent("20");
      expect(bar()).toEqual([1, 2, 3, 4, 5]);
    });

    it.each([
      ["NaN", Number.NaN],
      ["infinite", Number.POSITIVE_INFINITY],
      ["zero", 0],
      ["negative", -10],
      ["below one", 0.5],
    ])("reads a %s page size as 1", (_case, pageSize) => {
      renderPagination({ totalItems: 3, pageSize });
      expect(statusText()).toBe("1–1 of 3");
      expect(bar()).toEqual([1, 2, 3]);
      expect(sizeField()).toHaveTextContent("1");
    });

    it("floors a fractional page size", () => {
      renderPagination({ totalItems: 10, pageSize: 2.5 });
      expect(statusText()).toBe("1–2 of 10");
      expect(bar()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("page-size choices", () => {
    it("hides the field and falls back to 10 per page with no options", () => {
      renderPagination({ pageSizeOptions: [] });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByText("Items per page")).not.toBeInTheDocument();
      expect(document.querySelector(".vpg-pagination-size")).toBeNull();
      expect(statusText()).toBe("1–10 of 100");
    });

    it("hides the field with a single option and uses it as the size", () => {
      renderPagination({ pageSizeOptions: [25] });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(statusText()).toBe("1–25 of 100");
    });

    it("hides the field when every option is the same size", () => {
      renderPagination({ pageSizeOptions: [20, 20, 20] });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(statusText()).toBe("1–20 of 100");
    });

    it("still honours defaultPageSize with the field hidden", () => {
      renderPagination({ pageSizeOptions: [], defaultPageSize: 30 });
      expect(statusText()).toBe("1–30 of 100");
    });

    it("offers each distinct size once, in order", () => {
      renderPagination({ pageSizeOptions: [10, 10, 25, 10, 50, 25] });
      fireEvent.click(sizeField());
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["10", "25", "50"]);
    });
  });
});
