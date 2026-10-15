import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Table } from "../Table/Table.js";

export interface DataTableErrorRowProps {
  /** Why the last request for more rows failed. */
  error: ReactNode;
  /** The Retry button's text and accessible name. */
  retryLabel: string | undefined;
  columnCount: number;
  onRetry: () => void;
}

/**
 * The row an infinite table draws after its loaded rows while a request for more has failed: one
 * cell across every column holding `error` and a Retry button that calls `onRetry`. It is content,
 * not a data row: unlike a skeleton row it stays in the accessibility tree, so the button is
 * reachable, and it carries no `aria-rowindex`, so it is not one of the rows `aria-rowcount`
 * counts. The button keeps focus across a click while the row stays drawn; once the row is
 * replaced the button is removed with it, and the browser moves focus to the document's body.
 */
export function DataTableErrorRow({ error, retryLabel = "Retry", columnCount, onRetry }: DataTableErrorRowProps) {
  return (
    <Table.Row className="vpg-data-table-error">
      <Table.Cell colSpan={Math.max(1, columnCount)}>
        {error}{" "}
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      </Table.Cell>
    </Table.Row>
  );
}
