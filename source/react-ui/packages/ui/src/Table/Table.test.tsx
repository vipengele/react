import { createRef, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table } from "./Table.js";

function Rows() {
  return (
    <>
      <Table.Row>
        <Table.Cell>Ada</Table.Cell>
      </Table.Row>
      <Table.Row>
        <Table.Cell>Grace</Table.Cell>
      </Table.Row>
    </>
  );
}

function renderTable(props: Parameters<typeof Table>[0] = {}) {
  return render(
    <Table {...props}>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Name</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Rows />
      </Table.Body>
      <Table.Foot>
        <Table.Row>
          <Table.Cell>2 people</Table.Cell>
        </Table.Row>
      </Table.Foot>
    </Table>,
  );
}

describe("Table", () => {
  it("renders a table inside a scroll container", () => {
    const { container } = renderTable();
    const wrapper = container.querySelector(".vpg-table-container");
    const table = screen.getByRole("table");
    expect(wrapper?.tagName).toBe("DIV");
    expect(wrapper?.firstElementChild).toBe(table);
    expect(table).toHaveClass("vpg-table");
  });

  it("injects its stylesheet keyed by href and precedence", () => {
    renderTable();
    const sheets = document.querySelectorAll("style[data-href='vpg-table']");
    expect(sheets).toHaveLength(1);
    expect(sheets[0]).toHaveAttribute("data-precedence", "vpg-table");
    expect(sheets[0]?.textContent).toContain(".vpg-table-container");
  });

  it("renders every part as its native element with its class", () => {
    renderTable();
    const table = screen.getByRole("table");
    expect(table.querySelector("thead")).toHaveClass("vpg-table-head");
    expect(table.querySelector("tbody")).toHaveClass("vpg-table-body");
    expect(table.querySelector("tfoot")).toHaveClass("vpg-table-foot");
    expect(table.querySelectorAll("tr.vpg-table-row")).toHaveLength(4);
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveClass("vpg-table-header-cell");
    expect(screen.getByRole("cell", { name: "Ada" }).tagName).toBe("TD");
    expect(screen.getByRole("cell", { name: "Ada" })).toHaveClass("vpg-table-cell");
  });

  it("renders rows supplied through fragments and wrapper components", () => {
    renderTable();
    expect(screen.getByRole("cell", { name: "Grace" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("defaults to regular density without a sticky header", () => {
    renderTable();
    expect(screen.getByRole("table").getAttribute("class")).toBe("vpg-table vpg-table-density-regular");
  });

  it.each(["compact", "regular", "relaxed"] as const)("renders the %s density class", (density) => {
    renderTable({ density });
    expect(screen.getByRole("table")).toHaveClass(`vpg-table-density-${density}`);
  });

  it("marks the table for a sticky header when stickyHeader is set", () => {
    renderTable({ stickyHeader: true });
    expect(screen.getByRole("table")).toHaveClass("vpg-table-sticky-header");
  });

  it("makes the container a focusable region labelled by the caption", () => {
    const { container } = renderTable({ caption: "Staff" });
    const region = screen.getByRole("region", { name: "Staff" });
    const caption = container.querySelector("caption");
    expect(region).toHaveClass("vpg-table-container");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(caption).toHaveClass("vpg-table-caption");
    expect(caption?.id).not.toBe("");
    expect(region).toHaveAttribute("aria-labelledby", caption?.id);
    expect(screen.getByRole("table", { name: "Staff" })).toBeInTheDocument();
  });

  it("accepts any node as the caption", () => {
    renderTable({ caption: <strong>Staff</strong> });
    expect(screen.getByRole("region", { name: "Staff" })).toBeInTheDocument();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["false", false],
    ["an empty string", ""],
  ] as [string, ReactNode][])("renders no caption and a plain container when the caption is %s", (_, caption) => {
    const { container } = renderTable({ caption });
    const wrapper = container.querySelector(".vpg-table-container");
    expect(container.querySelector("caption")).toBeNull();
    expect(wrapper).not.toHaveAttribute("role");
    expect(wrapper).not.toHaveAttribute("tabindex");
    expect(wrapper).not.toHaveAttribute("aria-labelledby");
  });

  it("gives each table's caption its own id", () => {
    render(
      <>
        <Table caption="One" />
        <Table caption="Two" />
      </>,
    );
    const [one, two] = screen.getAllByRole("region");
    expect(one?.getAttribute("aria-labelledby")).not.toBe(two?.getAttribute("aria-labelledby"));
  });

  it("applies className and style to the container, and ref and native props to the table", () => {
    const ref = createRef<HTMLTableElement>();
    const { container } = renderTable({
      ref,
      className: "custom",
      style: { blockSize: "10rem" },
      id: "staff",
      "aria-describedby": "note",
    });
    const wrapper = container.querySelector<HTMLDivElement>(".vpg-table-container");
    const table = screen.getByRole("table");
    expect(wrapper).toHaveClass("vpg-table-container", "custom");
    expect(wrapper?.style.blockSize).toBe("10rem");
    expect(table).not.toHaveClass("custom");
    expect(table).not.toHaveAttribute("style");
    expect(ref.current).toBe(table);
    expect(table).toHaveAttribute("id", "staff");
    expect(table).toHaveAttribute("aria-describedby", "note");
    expect(wrapper).not.toHaveAttribute("id");
  });
});

describe("Table.HeaderCell", () => {
  it("defaults to a start-aligned column header", () => {
    render(
      <table>
        <thead>
          <tr>
            <Table.HeaderCell>Name</Table.HeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const cell = screen.getByRole("columnheader", { name: "Name" });
    expect(cell).toHaveAttribute("scope", "col");
    expect(cell.getAttribute("class")).toBe("vpg-table-header-cell vpg-table-align-start");
  });

  it("takes a row scope", () => {
    render(
      <table>
        <tbody>
          <tr>
            <Table.HeaderCell scope="row">Ada</Table.HeaderCell>
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByRole("rowheader", { name: "Ada" })).toHaveAttribute("scope", "row");
  });

  it.each(["start", "center", "end"] as const)("renders the %s alignment class", (align) => {
    render(
      <table>
        <thead>
          <tr>
            <Table.HeaderCell align={align}>Name</Table.HeaderCell>
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByRole("columnheader")).toHaveClass(`vpg-table-align-${align}`);
  });
});

describe("Table.Cell", () => {
  it("defaults to start alignment", () => {
    render(
      <table>
        <tbody>
          <tr>
            <Table.Cell>Ada</Table.Cell>
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByRole("cell").getAttribute("class")).toBe("vpg-table-cell vpg-table-align-start");
  });

  it.each(["start", "center", "end"] as const)("renders the %s alignment class", (align) => {
    render(
      <table>
        <tbody>
          <tr>
            <Table.Cell align={align}>Ada</Table.Cell>
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByRole("cell")).toHaveClass(`vpg-table-align-${align}`);
  });
});

describe("Table parts", () => {
  it("pass ref, className and native props through to their elements", () => {
    const head = createRef<HTMLTableSectionElement>();
    const body = createRef<HTMLTableSectionElement>();
    const foot = createRef<HTMLTableSectionElement>();
    const row = createRef<HTMLTableRowElement>();
    const headerCell = createRef<HTMLTableCellElement>();
    const cell = createRef<HTMLTableCellElement>();

    render(
      <Table>
        <Table.Head ref={head} className="h" data-part="head">
          <Table.Row ref={row} className="r" data-part="row">
            <Table.HeaderCell ref={headerCell} className="hc" colSpan={2}>
              Name
            </Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body ref={body} className="b" data-part="body">
          <Table.Row>
            <Table.Cell ref={cell} className="c" colSpan={2}>
              Ada
            </Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Foot ref={foot} className="f" data-part="foot" />
      </Table>,
    );

    expect(head.current).toHaveClass("vpg-table-head", "h");
    expect(head.current).toHaveAttribute("data-part", "head");
    expect(body.current).toHaveClass("vpg-table-body", "b");
    expect(body.current).toHaveAttribute("data-part", "body");
    expect(foot.current).toHaveClass("vpg-table-foot", "f");
    expect(foot.current).toHaveAttribute("data-part", "foot");
    expect(row.current).toHaveClass("vpg-table-row", "r");
    expect(row.current).toHaveAttribute("data-part", "row");
    expect(headerCell.current).toHaveClass("vpg-table-header-cell", "hc");
    expect(headerCell.current).toHaveAttribute("colspan", "2");
    expect(cell.current).toHaveClass("vpg-table-cell", "c");
    expect(cell.current).toHaveAttribute("colspan", "2");
  });
});
