---
status: accepted
---

# `DataTable` infinite scroll is a virtualized mode with an effect-driven `onLoadMore`

`DataTable` pages (`paginated`, ADR 0046) and windows (`virtualized`). A consumer whose source is
a cursor, or too large to page by number, needs a third way to supply `rows`: append them as the
reader nears the end. This records how that mode is switched on, when it asks for rows, how it
counts them for assistive technology, and who owns the order. `DataTable` still never fetches.

## Decision

**Infinite scroll is a mode of the virtualized table, switched on by `onLoadMore`.** There is no
`infinite` flag: a table that passes `onLoadMore` is infinite. It requires `virtualized`, because
a table that mounts every row has no end to be near, and a scroll-driven append to an unwindowed
table would grow the DOM without bound. The props on the virtualized arm are `onLoadMore(): void`,
`hasMore: boolean` (required, so a consumer cannot forget to say the source is exhausted),
`loadingMore?: boolean` and `loadMoreThreshold?: number` (default 5). `totalItems` stays optional
and, when known, makes the row count exact. Paging and scroll-loading are two ways to supply
`rows`, and the consumer picks one.

**The types make the choice a compile error, and at runtime paging wins.** The infinite arm
declares `paginated?: false` and every paging prop (`page`, `defaultPage`, `onPageChange`,
`pageSize`, `defaultPageSize`, `onPageSizeChange`, `pageSizeOptions`, `paginationVariant`,
`paginationLabels`) as `never`. The other arms declare the four infinite props as `never`, which
the component's destructuring needs of a union. Only a consumer who passes `onLoadMore` meets the
restriction: a `paginated={flag}` call site is unchanged. TypeScript reports a failed union
assignment against the arm it considers closest, and with `paginated` beside `onLoadMore` that is
often the other arm, so the message reads `onLoadMore` is not assignable to `undefined`. It points
at the arm the consumer did not mean, and the fix is to drop one of the two, not to remove
`onLoadMore`. If both reach the component untyped, `paginated` wins and `onLoadMore` is ignored.

**`Omit` over the props union breaks for wrappers, and a helper replaces it.** `Omit` does not
distribute over a union, so `Omit<DataTableProps<Row>, "virtualized" | "rowHeight">` now carries
the four `never` infinite keys of every arm, and a wrapper that omitted only those keys stops
compiling on upgrade. The break is narrow, accepted, and recorded in the release notes of the
release that ships this. `DataTablePropsOmit<Row, Keys>` is the distributive replacement, exported
from the package, and a wrapper moves to it.

**`onLoadMore` is called from an effect, an intentional exception to the package rule.** The
rule (ADR 0043, `usePaginationState`) is that a consumer callback is never fired from an effect:
state that is derived is derived at render, and only an event reports a change. The end signal
cannot follow it. A first page that does not fill the container leaves the end in view with no
scroll to report, and an empty table has no row to scroll at all, so a signal driven by scroll
events alone would leave a short list stranded. The table therefore asks from an effect that reads
the virtualizer's range after each commit, and asks again after each page until the container
fills or `hasMore` goes `false`. `onLoadMore` may be called without any scroll, and it must be safe
to call once per armed state. The dedupe is held in a ref, not in state, because StrictMode's
simulated remount keeps refs and runs the effect twice: a state-based latch would ask twice.

The signal fires at most once per armed state, and the table is armed again only when the count of
`rows` changes, when `loadingMore` has been seen set (the consumer took the request up, whether or
not the page it brings has rows), or when `rows` is replaced after a header sort click. Scrolling
away from the end and back does not ask again. It never fires while `loadingMore` or `loading` is
set, or while `hasMore` is `false`. A page that returns no rows while `hasMore` is still `true`
asks again after its request cycle, so the consumer sets `hasMore` to `false` once the source is
exhausted; the docs say so. A scroll container with no size has no range, so a table with rows
never asks while its container is `display: none` or laid out by nothing, as under jsdom; an empty
table treats having no rows as near the end and asks on mount.

**A void callback is still under the Scope rule.** The rule (`start-consumer-io-in-the-enclosing-scope`)
is written for callbacks that return a promise, but its reason holds for `onLoadMore`: its job is
to reach an external system, and the code it starts reads attributes of the nearest
`ScopeProvider` (a tenant or request identifier) and logs or traces under them. An effect runs
with no ambient scope of its own in a browser, so without the explicit re-entry the call loses
those attributes with no error. The table captures `useScope()` at render, holds it in a ref
written by an effect, and starts the call inside `Scope.propagate(scope, ...)`. Only the
callback's synchronous start is in the scope; past its first `await` the consumer re-enters it.
`@vipengele/react-telemetry` is already a peer dependency, and `bundle-check` asserts a
`DataTable` bundle carries it and a Button-only bundle does not.

**The threshold counts rows from the last row in view.** `loadMoreThreshold` is compared against
the range's `endIndex`, the last row in view, never the last mounted row. The window mounts
overscan beyond the view and adds the focused row's index wherever it is, so a mounted-row measure
would call a table at its end because a row far above holds focus. The overscan is not included:
the distance from the end is exactly the threshold.

**`aria-rowcount` is honest about what is unknown.** A windowed table carries `aria-rowcount`,
and the header row is row 1:

- `-1` while `hasMore` is set and `totalItems` is not passed: the count is not known, which
  assistive technology announces as such instead of announcing the rows loaded as the whole table.
- `max(totalItems, loaded) + 1` when `totalItems` is passed, never below the rows loaded.
- `loaded + 1` once `hasMore` is `false`.

The count is a pure function in `rowCounts.ts`, which reads `totalItems` itself, since an infinite
table does not go through `usePaginationState`. Skeleton rows appended while `loadingMore` are
`aria-hidden` and carry no `aria-rowindex`. `loadingMore` replaces nothing, so the loaded rows
stay mounted and the focused row stays pinned; `loading` still replaces the body.

**Sorting is the consumer's.** With `onLoadMore` set, sorting is manual, as with `manual`: the
table never reorders the loaded rows, because a sort of a prefix of the source is not the first
rows of the sorted source. A header click reports `onSortChange`, and the consumer replaces `rows`
with the first page of the new order and resets `hasMore`. The sort click also scrolls the
container to its top inside the click handler, with no effect, so the reader starts at the first
row of the new order. Two rules keep the end signal from asking against the order just left:
nothing fires until the virtualizer has seen the scroll (the range at the click is still the old
offset's, the end perhaps among it), and the re-arm waits until `rows` is replaced. The wait is
by identity: a consumer that passes a new `rows` array on every render re-arms the signal at the
next render after the click, and a short list may then be asked about the old rows. A consumer
keeps `rows` stable between fetches.

**Selection needs no change, but wants `getRowId`.** Select-all and Shift ranges run over the
drawn rows, which are the loaded rows, and ids survive appends. The index default of `getRowId`
names a position, so it re-targets the selection when a sort replaces the dataset; a selectable
infinite table supplies `getRowId`. The docs say so and nothing enforces it.

**An unbounded container is a documented failure mode, not a guarded one.** A scroll container
with no bounded block size mounts every row, so the range always ends at the last row and the
signal asks for page after page until `hasMore` is `false`, fetching the whole dataset. This is
the existing virtualized requirement (a bounded block size through `className` or `style`) with a
worse consequence, and has a story. Detecting it would mean measuring the container against its
content on every commit, for a mistake the first render shows.

**A failed request is an error row with a Retry button, and the end signal is quiet while it is
drawn.** The infinite arm takes `loadMoreError?: ReactNode` and `loadMoreRetryLabel?: string`, both
`never` on the other arms. Setting `loadMoreError` to any non-nullish value suppresses the end
signal, so a failure does not retry in a loop at the bottom. The error is drawn as one `<tr>` after
the end spacer, in the place the skeleton rows take, holding the error and a Retry button whose text
and accessible name is `loadMoreRetryLabel`. Retry calls `onLoadMore` inside the same
`Scope.propagate` scope as the effect, and counts as the armed state's one call: the consumer clears
`loadMoreError` and sets `loadingMore` when it takes the retry up, which arms the table again
through the `loadingMore` rule. Unlike a skeleton row the error row is content, and a hidden row
would hide the button from assistive technology, so it is not `aria-hidden`; it is not one of the
table's data rows, so it carries no `aria-rowindex` and is not in `aria-rowcount`. The skeleton rows
and the error row are never drawn together: `loadingMore` wins. With no rows loaded the error row
replaces `emptyState`, which is drawn only when `!hasMore`, not `loadingMore`, and no error is set.
Retry keeps focus across a click while the consumer keeps the error set. When the error row is
replaced the button is removed with it and the browser moves focus to the document's body; the
table does not move it.

## Considered options

- **An `infinite` flag beside `onLoadMore`.** Rejected: two props that must agree, and a flag
  without the callback or the callback without the flag is a state with no meaning. Passing
  `onLoadMore` is the whole switch.
- **Infinite scroll on a table that is not virtualized.** Rejected: appending to a table that
  mounts every row is a performance cliff the consumer meets at the size infinite scroll exists
  for, and it needs a second end-of-list measure beside the virtualizer's range.
- **A scroll-event-driven callback, no effect.** Rejected: it never fires for rows that do not
  fill the container or for an empty table, so every consumer would have to prefetch by hand.
- **A sentinel row observed with `IntersectionObserver`.** Rejected: the windowed body has a
  spacer, not the last row, mounted at the end, and a sentinel would sit in the table's rows.
  The virtualizer's range already says what is in view.
- **Deduping in state.** Rejected: StrictMode's simulated remount re-runs the effect against the
  committed state and asks twice. A ref survives it.
- **Treating a void callback as outside the Scope rule.** Rejected: the rule's reason is that
  the callback reaches an external system under the provider's attributes, not that it returns a
  promise.
- **Sorting the loaded rows in the table.** Rejected: the loaded rows are a prefix of the source,
  so their sorted order is not the sorted source's first rows, and the next page would arrive
  out of order.
- **Guarding the unbounded container.** Rejected, see above.
