import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Ellipsis, type IconComponent } from "@vipengele/react-icons";
import { type ComponentPropsWithRef, useId } from "react";
import { Dropdown } from "../Dropdown/Dropdown.js";
import { useControllableState } from "../internal/useControllableState.js";
import { paginationStylesheet } from "./Pagination.stylesheet.js";
import { pageWindow } from "./pageWindow.js";

/** The items the current page shows, 1-based and inclusive, out of `total`. */
export interface PaginationRange {
  from: number;
  to: number;
  total: number;
}

export interface PaginationProps extends Omit<ComponentPropsWithRef<"nav">, "children"> {
  /** How many items there are across every page. A negative or non-finite count reads as `0`. */
  totalItems: number;
  /** Makes the current page controlled; pair it with `onPageChange`. 1-based. */
  page?: number;
  /** The initial page when the page is uncontrolled. Defaults to `1`. */
  defaultPage?: number;
  /** Called with the page the user moved to, in both modes. Never called from an effect: a page
   * out of range is clamped for display only, and a controlled caller corrects its own value. */
  onPageChange?: (page: number) => void;
  /** Makes the page size controlled; pair it with `onPageSizeChange`. */
  pageSize?: number;
  /** The initial page size when the page size is uncontrolled. Defaults to the first of
   * `pageSizeOptions`, or `10` when that is empty. */
  defaultPageSize?: number;
  /** Called with the page size the user picked, in both modes. */
  onPageSizeChange?: (pageSize: number) => void;
  /** The page sizes the page-size field offers. Repeated values count once, and with fewer than
   * two distinct sizes there is nothing to choose, so the field is not rendered. Defaults to
   * `[10, 20, 50]`. */
  pageSizeOptions?: readonly number[];
  /** How many numbered pages show on each side of the current one. Defaults to `1`. */
  siblings?: number;
  /** The navigation landmark's accessible name. Defaults to `"Pagination"`. */
  "aria-label"?: string;
  /** The first-page button's accessible name. Defaults to `"First page"`. */
  firstPageLabel?: string;
  /** The previous-page button's accessible name. Defaults to `"Previous page"`. */
  previousPageLabel?: string;
  /** The next-page button's accessible name. Defaults to `"Next page"`. */
  nextPageLabel?: string;
  /** The last-page button's accessible name. Defaults to `"Last page"`. */
  lastPageLabel?: string;
  /** A numbered page button's accessible name. Defaults to `` `Page ${page}` ``. */
  pageLabel?: (page: number) => string;
  /** The page-size field's visible label, which is also its accessible name. Defaults to
   * `"Items per page"`. */
  pageSizeLabel?: string;
  /** The status text for a non-empty range. Defaults to `` `${from}–${to} of ${total}` ``. */
  rangeLabel?: (range: PaginationRange) => string;
  /** The status text when `totalItems` is `0`. Defaults to `"No items"`. */
  emptyLabel?: string;
}

const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50];

function defaultPageLabel(page: number): string {
  return `Page ${page}`;
}

function defaultRangeLabel({ from, to, total }: PaginationRange): string {
  return `${from}–${to} of ${total}`;
}

/** A positive whole page size. Anything else — zero, negative, fractional below one, `NaN`,
 * infinite — reads as `1`, so every division below stays finite. */
function toPageSize(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

/** A whole, non-negative item count. */
function toTotal(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** `value` floored into `1..pageCount`. `NaN` reads as `1`. */
function clampPage(value: number, pageCount: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(Math.max(Math.floor(value), 1), pageCount);
}

interface StepButtonProps {
  icon: IconComponent;
  label: string;
  disabled: boolean;
  onClick: () => void;
}

function StepButton({ icon: Glyph, label, disabled, onClick }: StepButtonProps) {
  return (
    <li className="vpg-pagination-item">
      <button type="button" className="vpg-pagination-button" aria-label={label} disabled={disabled} onClick={onClick}>
        <Glyph className="vpg-pagination-icon" aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * A pagination bar: the range of items in view, announced through a `role="status"` element; a
 * page-size field; and first, previous, numbered and next, last page buttons, inside a `<nav>`
 * landmark. Numbered pages are windowed — the first and last page always, `siblings` pages either
 * side of the current one, and a hidden-from-assistive-technology ellipsis for each run left out —
 * and the current page carries `aria-current="page"`.
 *
 * The page and the page size are each controlled (`page`/`onPageChange`,
 * `pageSize`/`onPageSizeChange`) or held by the component, seeded by `defaultPage` and
 * `defaultPageSize`. The page shown is always clamped into `1..pageCount`, where `pageCount` is at
 * least `1`, so an empty list still shows page 1 of 1. That clamp is display-only: no change is
 * reported until the user acts, so a controlled caller that ignores a callback never loops.
 *
 * Changing the page size keeps the first item in view on the page shown: the new page is the one
 * holding it, reported through `onPageChange` after `onPageSizeChange` when it differs from the page
 * shown. Pressing the current page's button reports nothing.
 *
 * Every visible and accessible string has an override prop with an English default. `className`,
 * `style`, `ref` and any other native attribute land on the `<nav>`.
 */
export function Pagination({
  totalItems,
  page,
  defaultPage = 1,
  onPageChange,
  pageSize,
  defaultPageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  siblings = 1,
  "aria-label": ariaLabel = "Pagination",
  firstPageLabel = "First page",
  previousPageLabel = "Previous page",
  nextPageLabel = "Next page",
  lastPageLabel = "Last page",
  pageLabel = defaultPageLabel,
  pageSizeLabel = "Items per page",
  rangeLabel = defaultRangeLabel,
  emptyLabel = "No items",
  className,
  ...rest
}: PaginationProps) {
  const sizeLabelId = useId();
  const [rawPage, setPage] = useControllableState(page, () => defaultPage, onPageChange);
  const [rawPageSize, setPageSize] = useControllableState(pageSize, () => defaultPageSize ?? pageSizeOptions[0] ?? 10, onPageSizeChange);

  const size = toPageSize(rawPageSize);
  const total = toTotal(totalItems);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = clampPage(rawPage, pageCount);
  const onFirst = current === 1;
  const onLast = current === pageCount;

  const status = total === 0 ? emptyLabel : rangeLabel({ from: (current - 1) * size + 1, to: Math.min(current * size, total), total });
  // A repeated size would give two options the same value, which `Dropdown` identifies them by.
  const sizeChoices = [...new Set(pageSizeOptions)];

  function goTo(next: number) {
    if (next !== current) setPage(next);
  }

  function changePageSize(nextSize: number) {
    if (nextSize === size) return;
    setPageSize(nextSize);
    // The page holding the item that opened the current page. That item exists whenever there
    // are items at all, so the page is always within the new page count.
    goTo(Math.floor(((current - 1) * size) / toPageSize(nextSize)) + 1);
  }

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N pagination bars on a page inject
        one stylesheet, alongside the one the composed `Dropdown` injects.
      */}
      <style href="vpg-pagination" precedence="vpg-pagination">
        {paginationStylesheet}
      </style>
      <nav {...rest} aria-label={ariaLabel} className={["vpg-pagination", className].filter(Boolean).join(" ")}>
        <div role="status" className="vpg-pagination-status">
          {status}
        </div>
        {sizeChoices.length > 1 ? (
          <div className="vpg-pagination-size">
            <span id={sizeLabelId} className="vpg-pagination-size-label">
              {pageSizeLabel}
            </span>
            <Dropdown
              className="vpg-pagination-size-control"
              searchable={false}
              aria-labelledby={sizeLabelId}
              value={{ value: String(size), label: String(size) }}
              onChange={(selected) => {
                if (selected !== null) changePageSize(Number(selected.value));
              }}
            >
              {sizeChoices.map((choice) => (
                <Dropdown.Option key={choice} value={String(choice)} label={String(choice)} />
              ))}
            </Dropdown>
          </div>
        ) : null}
        <ul className="vpg-pagination-list">
          <StepButton icon={ChevronsLeft} label={firstPageLabel} disabled={onFirst} onClick={() => goTo(1)} />
          <StepButton icon={ChevronLeft} label={previousPageLabel} disabled={onFirst} onClick={() => goTo(current - 1)} />
          {pageWindow(current, pageCount, siblings).map((item) =>
            item.kind === "ellipsis" ? (
              <li key={`ellipsis-${item.side}`} className="vpg-pagination-item" aria-hidden="true">
                <span className="vpg-pagination-ellipsis">
                  <Ellipsis className="vpg-pagination-icon" />
                </span>
              </li>
            ) : (
              <li key={item.page} className="vpg-pagination-item">
                <button
                  type="button"
                  className="vpg-pagination-button"
                  aria-label={pageLabel(item.page)}
                  aria-current={item.page === current ? "page" : undefined}
                  onClick={() => goTo(item.page)}
                >
                  {item.page}
                </button>
              </li>
            ),
          )}
          <StepButton icon={ChevronRight} label={nextPageLabel} disabled={onLast} onClick={() => goTo(current + 1)} />
          <StepButton icon={ChevronsRight} label={lastPageLabel} disabled={onLast} onClick={() => goTo(pageCount)} />
        </ul>
      </nav>
    </>
  );
}
