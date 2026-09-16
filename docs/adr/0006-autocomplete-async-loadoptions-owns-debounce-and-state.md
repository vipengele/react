# Autocomplete's async data source is a `loadOptions` callback it owns, not consumer-managed children

ADR 0005 chose compound `Autocomplete.Option` children over a data-array prop so filtering and
selection state could work uniformly by inspecting declared elements. That choice assumes every
option is known up front. An API-backed autocomplete breaks the assumption outright: a result
that hasn't come back from the network yet has no element for a consumer to have declared, so
there is nothing for `children` to filter.

`Autocomplete` resolves this with a second, alternate mode rather than stretching the
compound-children one to cover it: passing `loadOptions: (query: string) => Promise<{value,
label, icon?, disabled?}[]>` switches `Autocomplete` into async mode, where `children` is
ignored entirely and `Autocomplete` renders internally-constructed `Autocomplete.Option`
elements from whatever `loadOptions` resolves to. `Autocomplete` owns debouncing (`debounceMs`,
default 300ms), a loading state (`loadingMessage`) and an error state (`errorMessage`) itself,
and discards an out-of-order response — a slow earlier search resolving after a faster later one
— by comparing a token captured when a search starts against the latest one when it resolves.
Client-side substring filtering is skipped in this mode: filtering the query is the API's job,
and re-filtering results it already filtered would silently hide results whose label doesn't
literally contain the exact query substring the API may have matched more loosely.

The two modes are mutually exclusive on the same component rather than two separate exports,
because everything downstream of "what the current option list is" — the keyboard model,
highlighting, `multiple` selection and chips, the shared `internal/useListboxKeyboard.ts` hook —
is identical either way. Only how that list is produced differs.

## Considered options

- **Consumer-controlled options**: `Autocomplete` stays exactly as ADR 0005 left it: the
  consumer wires their own `onInputChange`, debounces and fetches themselves, and re-renders new
  `Autocomplete.Option` children as results arrive. Rejected because it pushes debouncing,
  loading/error state and race-condition handling — the same handful of lines — onto every
  consumer that wants this, for no benefit specific to any one of them.
- **A single `options` data-array prop covering both modes**: would have unified sync and async
  under one shape, but reopens ADR 0005's rejected data-driven idiom for the sync case too,
  where compound children work fine and match the rest of the package's list-like components.

## Consequence worth flagging

An initial `value`/`defaultValue` has no label to seed the input, or a `multiple` chip, with
until something has actually been searched and selected through the component — async mode has
no way to resolve a label for a value it was simply handed, unlike sync mode where every
possible value's label is always known from `children`. Documented as a known limitation, not
solved by adding a `getOptionLabel`/label-resolution prop, since nothing in this slice's scope
needs it and it can be added later without breaking the `loadOptions` shape.
