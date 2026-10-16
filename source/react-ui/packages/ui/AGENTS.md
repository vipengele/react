# @vipengele/react-ui

Vipengele's themeable React component library. See the root `AGENTS.md` for monorepo-wide commands
and policy, and `README.md` in this directory for the consumer-facing API.

## Rules

This module has prescriptive rules in `.agents/rules/`. **Read every file in that directory before making changes here, and follow each rule strictly.**
Each file contains one rule. New rules go in that directory — one file per rule, kebab-case filename matching the rule's intent.

## Commands

```bash
pnpm --filter @vipengele/react-ui build         # tsup && tsc -p tsconfig.build.json
pnpm --filter @vipengele/react-ui type-check
pnpm --filter @vipengele/react-ui test          # vitest run --coverage && node bundle-check/run.mjs && node api-check/run.mjs
```

`api-check/run.mjs` fails when a table-engine package specifier (`@tanstack/`) appears in the
declarations reachable from `dist/index.d.ts`.

## Architecture

- One directory per component under `src/`, holding the `.tsx`, its `.stylesheet.ts` and its
  `.test.tsx`. `src/index.ts` re-exports each as a plain named export — never a namespace
  barrel, which would defeat the tree-shaking constraint.
- `src/internal/` holds code two or more components genuinely share (the floating-listbox
  keyboard hook, the listbox/option/checkbox/chip stylesheet, the spacing-token lookup, the
  align/justify keyword tables, `useOverlayRoot` and `overlayTree` — the portal target and
  `FloatingTree` registration every overlay uses; `useOverlayState`, the controlled/uncontrolled
  open state, vetoable close requests and `useDismiss` wiring every overlay shares; `useModalDialog`,
  the native `<dialog>` mechanics `Dialog` and `Drawer` build on; the menu panel (`menuPanel.tsx`: rows,
  validation and focus handling) and menu stylesheet (`menuStylesheet.ts`) that `Menu` and
  `ContextMenu` share; `useControllableState`, the controlled-or-uncontrolled state hook; and
  `useOverflowCollapse` and the pure helpers in `overflowCollapse.ts`, the shared measuring that
  decides how many items of a row fit; `useMediaQuery`, the SSR-safe `matchMedia` subscription
  (`undefined` until resolved) behind `SideNav`'s responsive switch;
  `paging.ts`, how `Pagination` and `DataTable` read a page size, an item count and a page;
  `useCalendarPopup` (with `usePanelMonth` and `openingMonth`), the calendar pop-up's open state,
  visible month and focus-return ref, and `useClearRejectedOnExternalChange`, which drops a
  rejected-draft flag when a controlled value moves on — both `DateField` hooks, each with its own
  suite; and
  `useRovingFocus`, the keyboard-only roving-focus hook where the caller owns the tab stop — see
  `docs/adr/0044-roving-focus-is-a-keyboard-only-hook-the-caller-owns-the-tab-stop.md`) rather
  than one component's directory reaching into another's internals. `src/internal/` never
  imports from a component. Nothing in
  `src/internal/` is re-exported from `src/index.ts` except the `SpaceToken` type, which a
  consumer needs to type a `gap` value, the `FlexAlign` and `FlexJustify` types, which reach
  the public API only as the `Stack*` and `Inline*` aliases, and the `DateRange`, `TimeRange` and
  `DateTimeRange` aliases of `localRange.ts`, which the range components' props name; its runtime
  values stay private. The
  package's 80% coverage threshold applies to it the same as to a component — through its callers'
  tests, if it has no suite of its own. A shared stylesheet gets its own
  `bundle-check/` marker, separate from every component's.
- A component may compose another component only if that component is itself exported from
  `src/index.ts` — importing a sibling's internals, or two components importing each other, is
  what `src/internal/` exists to prevent. `FieldShell` is exported for exactly this reason:
  `TextField`, `Textarea`, `PasswordInput` and `Dropdown` compose it, and `Dropdown` takes its
  `ref` to anchor its floating listbox to the whole field rather than to the control alone. See
  `docs/adr/0011-the-field-shell-as-keystone.md`. The range components are the deliberate
  exception: `RangeCalendar` imports `CalendarCore` from `src/Calendar/`, and the range fields
  import the model modules of their single-value siblings (`dateFieldEditing.ts`, `useTimeField`
  with `TimeFieldSegment`, `timeSegments.ts` and the stylesheet, `dateTimeFieldModel.ts`). Those
  are pure or model code the single-value field and its range sibling share, and a single-value
  field never imports from its range sibling.
- A `FieldShell` composer marks the child that should take the centre's free space with
  `vpg-field-shell-control` (`TextField`'s `<input>`, `Textarea`'s `<textarea>`, `Dropdown`'s
  trigger) — see
  `.agents/rules/mark-the-field-shell-control.md` and
  `docs/adr/0017-the-field-shell-grows-the-control-its-composer-names.md`.
- Styles are a template string injected via React 19's `<style href precedence>`, never a `.css`
  or CSS Module import. CSS Modules were tried and rejected: tsup/esbuild emits an empty class
  map, which Vitest's own resolution hides, so the package tests green and ships broken.
- A component may **read** `--vpg-*` properties through `var()` in its stylesheet, and may
  never **assign** a theme-assigned one as an inline style. An inline declaration beats every stylesheet rule for
  the same property on the same element, including `@vipengele/react-tokens`' dark-mode reassignment, so
  an inline theme property silently kills colour-mode adaptation for that instance.
- A `:visited` rule may only set `color` (and the other properties engines allow there for
  privacy) directly per tone class — never route it through a component-local custom property
  assigned under `:visited`, which engines discard. `Link` is the first component with a
  `:visited` state — see `.agents/rules/no-custom-property-assignment-under-visited.md`.
- A layout primitive (`Stack`, `Inline`, `Grid`, `Center`, `AspectRatio`) may assign its own
  component-scoped property, `--vpg-<primitive>-<prop>`, inline, and only to a `var()` read of a
  theme token, `0`, a mapped keyword, or a count or ratio. Its length props take token names
  (`gap="space-3"`), never a length (`gap={13}`) — see
  `docs/adr/0019-layout-primitives-accept-token-values-only.md`. It always writes every property
  its active mode reads, so the stylesheet rule for that mode reads each one bare; a property
  only another mode reads may go unwritten. `Stack` is the vertical one: one stylesheet keyed
  `vpg-stack`, fed by the inline `--vpg-stack-gap`, `--vpg-stack-align` and
  `--vpg-stack-justify` properties, with the token-name lookup shared through
  `src/internal/space.ts` and the align/justify keyword tables through
  `src/internal/flexKeywords.ts`. `Inline` is the horizontal, wrapping one: one stylesheet keyed
  `vpg-inline`, fed by the inline `--vpg-inline-gap`, `--vpg-inline-align`,
  `--vpg-inline-justify` and `--vpg-inline-wrap` properties, sharing `src/internal/space.ts` and
  `src/internal/flexKeywords.ts` with `Stack`. `Grid` has two modes — fixed `columns`, writing
  `--vpg-grid-columns`, and auto-fit, writing `--vpg-grid-min-column` from the column-width
  scale — see `docs/adr/0037-grid-columns-auto-fit-from-a-column-width-scale.md`.
  `AspectRatio` is one stylesheet keyed `vpg-aspect-ratio`, fed by the inline
  `--vpg-aspect-ratio-ratio` property, always written; a degenerate ratio (non-finite, zero,
  negative) is clamped to `1` in code so the stylesheet reads it bare.
  `Center` writes `--vpg-center-max` (a `var()` read of a `--vpg-width-*` step) and
  `--vpg-center-inset`, always both; `intrinsic` is the `vpg-center-intrinsic` class rather
  than a property — see
  `docs/adr/0023-center-caps-content-width-from-a-width-scale.md`.
  Outside the layout primitives, `DataTable` is the one component that assigns a component-scoped
  property inline: with `resizableColumns` it writes `--vpg-data-table-columns-width`, a pixel
  length, onto `Table`'s scroll container, merged under the consumer's `style`. Column widths are
  data the user changes at run time, never a token, so this is the one inline length; it assigns
  no theme property.
- Every such read is bare — `var(--vpg-space-2)`, never with a literal fallback — per
  `docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md` and
  `.agents/rules/no-literal-fallback-in-token-reads.md`.
  `src/no-fallback-var-reads.test.ts` globs the package's own source tree and fails the build on
  any offending read, including in a component that doesn't exist yet when the check is written.
- Stories live in `apps/storybook/src/`, not beside the component — a story importing Storybook
  would drag it into this package's dependency graph.
- React 19 / React DOM 19, `@vipengele/react-telemetry` and `@vipengele/react-tokens` are peer dependencies — every component reads the
  token substrate that `@vipengele/react-tokens` defines, so a consumer supplies both from the same tree
  rather than this package bundling its own copy. `@floating-ui/react`, `@vipengele/ts`,
  `@tanstack/react-virtual` and `@tanstack/react-table` are this package's only real (non-peer)
  runtime dependencies beyond `@vipengele/react-icons` — see
  `docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md`,
  `docs/adr/0035-numberinput-owns-spinbutton-semantics-and-locale-parsing.md`,
  `docs/adr/0039-tanstack-react-virtual-for-opt-in-tree-windowing.md` and
  `docs/adr/0046-datatable-takes-tanstack-table-as-its-behaviour-engine.md` before adding another.
- `NumberInput` is the package's first component that holds its own state and interprets
  keystrokes rather than passing straight through to a native element: the string on screen and
  the committed `number | undefined` value are different things with different lifetimes, so
  `onChange` fires on commit (blur, Enter, or a step) rather than per keystroke. All locale
  parsing and formatting go through `@vipengele/ts`'s `Numeric` — the package writes
  no number grammar of its own. A future locale-aware control (currency, a date field) follows
  the same shape: commit-only `onChange`, an unnamed visible input holding the display string,
  and a sibling `<input type="hidden">` carrying the caller's `name` and the canonical value, so a
  server never has to parse a locale-formatted string. See `docs/adr/0035-numberinput-owns-spinbutton-semantics-and-locale-parsing.md`.
- `TimeField` follows `NumberInput`'s shape for a segmented time: commit-only `onChange` (blur, Enter,
  the last segment filled, or a bound change that takes in a rejected time, and only with every
  segment filled), an unnamed visible control, and a
  sibling `<input type="hidden">` carrying the caller's `name` and the ISO value. The control is a
  `role="group"` of `role="spinbutton"` segments, the `FieldShell`'s marked control. The layout and
  all segment arithmetic are the pure model in `src/TimeField/timeSegments.ts`, built on
  `@vipengele/ts`'s `LocalTime`; the locale comes from `useLocale`. Its chrome relies on
  `FieldShell`'s composite-control rules (ring, dimming and invalid state keyed off the group).
  `min`/`max` are inclusive `LocalTime` bounds on the whole time, not on a segment:
  - An arrow step of a fully filled field that would leave `[min, max]` does nothing; an empty
    segment steps freely. Digit entry is range-checked per segment only.
  - A complete time outside the bounds is rejected on commit: `aria-invalid` on the group,
    `onChange` not called, the text kept. Feedback is immediate when the last segment is filled,
    else on blur or Enter.
  - A rejected time is judged again in an effect whenever `min` or `max` changes (keyed on their
    text): it commits once the new bounds take it in, and stays rejected otherwise. Nothing in the
    package relies on this for a moving bound; a caller that changes `min` or `max` gets it.
  - A `value`/`defaultValue` outside the bounds shows `aria-invalid` and is left uncorrected;
    `onChange` never fires for it. An arrow step is judged by the time it lands on: one that still
    lands out of bounds is refused, one that lands inside is accepted, and so is typing.
  - Segment `aria-valuemin`/`aria-valuemax` stay each segment's own range, never derived from the bounds.
  - `min` after `max` (a wrap-around window) is unsupported.
- `TimePanel` is a standalone set of hour, minute and (12-hour locales only) AM/PM option strips
  over `@vipengele/ts` `LocalTime`. The pure model — option lists, disabled options, nearest-allowed
  snapping, first-pick fill — lives in `src/TimePanel/timePanelModel.ts`; `TimePanel.tsx` renders it.
  Each strip is a `role="radiogroup"` and each option a `role="radio"`, with real-focus roving, not
  a `listbox` — see `docs/adr/0050-timepanel-option-strips-use-radiogroup.md`.
  - The panel has one tab stop, derived and never written to the DOM: the focused option while
    focus is on the panel, else the selected (or first) option of the strip focused last, else the
    first strip's. Chromium makes a scroll container with no tabbable descendant a tab stop of its
    own, so every strip carries `tabIndex={-1}`. Roving is hand-rolled because `useRovingFocus`
    handles one arrow pair per container; Up and Down move between strips, onto the adjacent
    strip's selected option.
  - A disabled option is `aria-disabled` and stays focusable. A pick of one, or of the time already
    selected, commits nothing.
  - The first pick on an empty panel fills the other strips with their first option, so what is
    shown is what is committed. An hour pick never flips AM/PM. A value whose minute is off the
    `minuteStep` grid inserts its minute into the strip in order.
  - The focused option, and every strip's selected option on mount and on any change of the time,
    scroll into view with `block` and `inline` `nearest`. That leaves the page still only while the
    strip is in the viewport: `nearest` also scrolls ancestors when the strip is off screen, which
    is why `Popover` keeps its panel on screen while its content mounts.
  - The 12-hour decision comes from `timeLayout(locale, false).twelveHour`, never `hourCycle`.
- Every floating surface (drawer, popover, listbox, menu, tooltip) and sticky element stacks via the token layers
  `--vpg-layer-sticky`/`-drawer`/`-popover`/`-listbox`/`-menu`/`-tooltip` from `@vipengele/react-tokens`, never a component-local
  `z-index` literal — see that package's `AGENTS.md` for the containment order they encode.
- `ErrorBoundary` is the package's first class component — React offers no hook equivalent of
  `getDerivedStateFromError`/`componentDidCatch`. `tsconfig.base.json`'s `noImplicitOverride`
  requires every lifecycle method it defines to carry the `override` keyword; a future class
  component follows the same pattern. It also deliberately overrides `StatePanel`'s
  required-`title` contract with a literal default so the safety net can render unconditionally
  — see `docs/adr/0020-errorboundary-overrides-statepanels-required-title-contract.md` before
  giving another `StatePanel` consumer a default of its own.
- Card and Tabs are compound components (`Card.Header`, `Tabs.Tab`, etc.) — the package's first
  use of this pattern and, for Tabs, its first React context. See
  `docs/adr/0003-card-compound-components-with-runtime-validation.md` and `.agents/rules/` for the
  conventions this introduces.
- `Dropdown`'s multi-select chip row is the package's first component that measures its own real
  layout rather than deriving everything from props and CSS: a `useLayoutEffect` reads chip and
  container widths off the DOM to decide how many chips fit, a `ResizeObserver` on the field
  re-runs that read whenever the container's width changes, and the callback flushes synchronously
  (`flushSync`) so the collapsed row lands in the same frame as the resize rather than one paint
  later. See `.agents/rules/measure-real-layout-in-a-flushed-layout-effect.md` for the pattern. The
  measuring is shared, not Dropdown-private: `src/internal/useOverflowCollapse.ts` is the hook
  (its doc comment holds the `data-collapsing` / `data-measuring` attribute contract) and
  `src/internal/overflowCollapse.ts` holds the pure helpers (`widthsOf`, `countFitting`,
  `countHidden`, `measureHidden`) that do the read itself; `Dropdown` consumes the hook. The
  collapse CSS (the `[data-collapsing]` rules) stays with the listbox stylesheet in
  `src/internal/listbox.stylesheet.ts`, not with the hook. A stylesheet shared through
  `src/internal/` needs its own `bundle-check/` marker, which the collapse rules do not have.
- `Dropdown` takes `Dropdown.Option` compound children rather than a data-array prop, matching
  Card/Tabs' idiom — see `docs/adr/0005-dropdown-autocomplete-compound-option-children.md`. It
  tracks the highlighted option via `aria-activedescendant` rather than moving real DOM focus into
  the listbox, sharing that keyboard/highlight handling through
  `src/internal/useListboxKeyboard.ts` — see
  `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`. Its search mode wraps the
  floating element in a non-modal `FloatingFocusManager` that puts real focus in the search input
  and returns it to the trigger on close; virtual focus via `aria-activedescendant` still governs
  which option is highlighted, and real DOM focus still never reaches the listbox itself — see
  `docs/adr/0013-dropdown-is-the-one-searchable-combobox.md`.

- `Dropdown` calls the consumer's `loadOptions(query)` through `Scope.propagate` in the nearest
  enclosing `ScopeProvider`'s scope (the default scope outside any provider). Only the loader's
  synchronous start is in that scope. `Dropdown` creates no scope and has no scope prop.
  `@vipengele/react-telemetry` is a peer dependency, never a regular one: an app holds one
  `ScopeContext`, and a second bundled copy would give `Dropdown` a context that none of the app's `ScopeProvider`s provide.

- `Menu` is a compound component (`Menu.Item`, `Menu.LinkItem`, `Menu.CheckboxItem`,
  `Menu.RadioItem`, `Menu.Separator`, `Menu.Group`) whose trigger is the `trigger` prop — its
  `children` are the rows. `Menu.LinkItem` is a real anchor (or the router link passed as `as`)
  that takes part in the roving focus, and Enter is left to the link's native activation.
  `MenuButton` is the ready-made button trigger. Unlike `Dropdown`, it moves real DOM focus
  onto its rows with a roving tabindex (floating-ui `useListNavigation` and `useTypeahead`), and
  disabled rows stay focus stops. Checked state belongs to the caller, a `Menu.RadioItem` requires
  a `Menu.Group`, and submenus are not supported. It is a `FloatingTree` node portalled through
  `useOverlayRoot` at `--vpg-layer-menu`. See
  `docs/adr/0026-menu-and-dropdown-are-separate-components.md`,
  `docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md` and
  `docs/adr/0046-menu-link-rows.md`.
- `ContextMenu` is a `Menu` opened from a region rather than a trigger: its `target` is wrapped in
  a `display: contents` `<div>` that carries the gesture handlers (`src/ContextMenu/useContextMenuTriggers.ts`:
  secondary click, touch long press, `Shift+F10`/`ContextMenu` key) and is never cloned. Its rows,
  panel, focus handling and stylesheet are `Menu`'s, shared through `src/internal/menuPanel.tsx`
  and `src/internal/menuStylesheet.ts`. With no DOM reference — floating-ui anchors to a virtual
  one, the pointer or the focused element — it passes the wrapper to `useOverlayRoot`. The
  innermost target wins and editable fields are not exempted; a lone `<tr>`/`<li>` cannot be a
  target and the wrapper adds no `tabIndex`. It stays action-only and does not accept
  `Menu.LinkItem`.
- `Checkbox` is a native `<input type="checkbox">` restyled with a `::before` glyph. `indeterminate`
  is a DOM property with no attribute, and a click clears it without re-rendering, so it is
  re-applied in an effect with no dependency array on every commit. The box aligns by its
  midpoint rather than its baseline, because the baseline moves with the tick. A labelled
  row is `display: flex; width: fit-content`, so consecutive rows stack like any other field.
- `Badge` is a static, non-interactive `<span>` with its own stylesheet. It does not reuse the
  `Dropdown` multi-select chip or the `.vpg-listbox-chip*` rules — the chip is coupled to the
  row-collapse measurement. See `docs/adr/0022-badge-and-tag-are-separate-from-the-dropdown-chip.md`.
- `Tag` composes the exported `Badge` and adds a remove button, the tag's only focusable element.
  `onRemove` is a callback — the tag never unmounts itself. The button's accessible name defaults
  to `Remove ${children}` only when `children` is a string; any other label type makes
  `removeLabel` required (a discriminated prop union).

- `ConfirmDialog` composes the exported `Dialog`, `Button`, `Stack`, `Inline` and `Typography`, and
  holds a promise-pending state that overrides the close contract of the `Dialog` it wraps: it
  always controls `Dialog` — in its uncontrolled form too, since an uncontrolled `Dialog` closes
  itself before reporting the request — and ignores every close request while `onConfirm`'s promise
  is pending. It ships no stylesheet, so its `bundle-check/` marker is a source string.

- `Toolbar` is a `role="toolbar"` container over arbitrary children, built on `useRovingFocus`. It
  finds its items by DOM query (`ITEM_SELECTOR` in `Toolbar.tsx`: natively enabled buttons, links
  and form controls at any depth) and writes `tabindex` on them imperatively, because it cannot
  clone children — a caller's `tabIndex` on an item is overwritten. A natively `disabled` control
  is not an item; an `aria-disabled` one stays a focus stop. `Button` supports `aria-disabled`
  for this (focusable, dimmed, `onClick` swallowed and default prevented), whereas `disabled` and
  `loading` set the native attribute and drop the button out of the tab order. See
  `docs/adr/0044-roving-focus-is-a-keyboard-only-hook-the-caller-owns-the-tab-stop.md`.
- `Drawer` is a panel anchored to one viewport edge, built on the same internal hooks as
  `Dialog`: `useModalDialog`, itself built on `useOverlayState`. Its stylesheet is the template
  string in `Drawer.stylesheet.ts`, injected via `<style href precedence>`, never a CSS Module.
  - `side` is `left`, `right`, `top` or `bottom`, default `right`. The sides are physical: `left`
    is the left edge in a right-to-left document too, and nothing flips.
  - Motion is entry-only: the drawer slides in from its side and closing is instant, because
    `close()` removes the dialog from the top layer and hides it in the same step. The component
    has no reduced-motion query of its own; its duration is a theme token that the theme's
    reduced-motion rule collapses.
  - Children are plain: there is no built-in header, footer or close button. The accessible name
    is exactly one of `aria-label` and `aria-labelledby`, enforced by the prop type.
  - `modal` defaults to `true`. The props are a discriminated union: `closeOnBackdropClick` exists
    only when modal, `closeOnOutsideClick` (default `false`) only when `modal={false}`.
  - Modal, it carries `data-vpg-overlay-root`, so an overlay opened from inside it portals into it
    rather than into the inert page.
  - `modal={false}` renders a `<div role="dialog" data-modal="false">` on the page layer at
    `z-index: var(--vpg-layer-drawer)`: no backdrop, no `aria-modal`, no scroll lock, no focus trap,
    and the page behind stays interactive. It resolves its portal target through `useOverlayRoot`
    from an inline hidden `<span>` sentinel, standing in for the trigger it does not have: the
    nearest modal surface (`Dialog` or modal `Drawer`) around it, else the nearest `.vpg-root`,
    else it renders inline where it is declared.
  - A non-modal drawer carries no `data-vpg-overlay-root`, so an overlay opened from inside it
    portals past it. It is an overlay-tree node, so `Escape` closes the innermost overlay only.
  - Focus moves to the first focusable element inside a non-modal drawer on open, or to the drawer
    itself when it holds none. On close it returns to the previously focused element only if focus
    is still inside the drawer or on `body` and that element is still connected.
  - With `closeOnOutsideClick` on, the consumer's own toggle button counts as an outside press,
    because the drawer has no reference element to exempt. Pressing it dismisses through
    `onOpenChange(false)` and the button's own handler reopens the drawer in the same tick. There
    is no exclusion API: a drawer opened by a toggle button leaves `closeOnOutsideClick` off.
  - `position: fixed` inside a `Dialog`'s `<dialog>` is viewport-relative only once the dialog's
    entry transform has finished, so a non-modal drawer that opens together with its `Dialog` is
    laid out against the dialog until the transition ends.
  - The `<dialog>` is a transparent, borderless, padding-free box that never clips; an inner
    `vpg-drawer-panel` carries the surface, padding and scroll. A click whose target is the
    `<dialog>` itself is therefore always a backdrop click, which is how `useModalDialog` detects
    one. Move any of that styling onto the `<dialog>` and a click on the panel's edge or
    scrollbar reads as a backdrop click.
- `Tree` is data-driven (`items` + `renderItem`) rather than compound. `src/Tree/flatten.ts`
  turns the items and the expanded set into the visible-row model, and everything else reads
  that model: roving tabindex is hand-rolled over it (exactly one row tabbable, focus moved by
  row index), never by querying the DOM for neighbours, so it holds when rows are unmounted.
  With `virtualized`, `@tanstack/react-virtual` windows the rows and a `rangeExtractor` always
  includes the tabbable row, so a focused or selected row scrolled out of view stays mounted and
  keyboard focus is not lost. Its suites are `Tree.test.tsx` and `flatten.test.ts` (jsdom) and
  `Tree.browser.test.tsx` (real layout, for windowing). See
  `docs/adr/0038-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md`.
- `FileInput` is the package's one component that drives the consumer's network call: it takes
  `upload(file, { onProgress, signal })` and owns an uncontrolled list of rows through
  `src/FileInput/useFileUploads.ts`, composing the exported `Progress` per row. It picks no
  transport. Uploads start in the add handler, never in an effect (StrictMode's simulated remount
  would abort them), through `Scope.propagate` in the nearest enclosing `ScopeProvider`'s scope
  (the default scope outside any provider) — only `upload`'s synchronous start is in that scope,
  and `FileInput` creates no scope and has no scope prop. Each in-flight upload's
  `AbortController` lives in a ref map that removal and unmount abort and clear — every
  settlement and progress tick checks the map first, so a late one is dropped even when the transport ignores `signal`. `onChange` fires on add, status change
  and removal, never per progress tick. Acceptance rules (`accept`, `maxSize`, `maxFiles`) live in
  `src/FileInput/acceptFile.ts`. See `docs/adr/0028-file-input-owns-upload-state.md`.

- `SegmentedControl` is a value picker, not a `Tabs` variant: a `radiogroup` of segments, each a
  `<label>` around a visually hidden native `<input type="radio">` sharing one `name`
  (`useId`-generated when omitted), so focus, arrow keys and form submission are the browser's
  and the component writes no keyboard code. It takes a flat `options` array, and composes
  neither `RadioGroup` nor `RadioButton`. See
  `docs/adr/0029-segmented-control-is-separate-from-tabs.md`.
- `ThemeToggle` is a `SegmentedControl` of three icon segments (`Sun`, `Moon`, `Monitor` from
  `@vipengele/react-icons`) over `useColorMode()`. The selected segment is the provider's
  preference (`colorMode`), never the resolved mode, and it throws outside a `ThemeProvider`.
  The group is named `"Color mode"` unless `aria-label`/`aria-labelledby` is passed, `labels`
  overrides each segment's accessible name, and `name` is forwarded unchanged to
  `SegmentedControl` (omitted, the submitted key is `useId`-generated). It ships no stylesheet, so
  its `bundle-check/` marker is the `"Color mode"` source string. Suites: `ThemeToggle.test.tsx`
  (jsdom) and `ThemeToggle.browser.test.tsx`.

- `Pagination` is one standalone component composing the package's non-searchable `Dropdown` for
  the page-size field. Page and page size are each controllable or uncontrollable through
  `src/internal/useControllableState.ts`. The displayed page is clamped at render and
  `onPageChange` never fires from an effect; changing the page size keeps the first visible item
  in view. `src/Pagination/pageWindow.ts` computes the numbered buttons and ellipses. The range
  text is visible inside a `role="status"` element. `variant="simple"` renders only the previous
  and next buttons around a "Page N of M" `role="status"` indicator, sharing the step buttons and
  state, under a `vpg-pagination-simple` class that the full bar's free-space rule excludes;
  `showFirstLast` (default `variant === "full"`) adds or removes the first/last buttons in
  either bar. See
  `docs/adr/0043-pagination-is-one-standalone-component-over-dropdown.md`.

- `Calendar` is a standalone month grid over `@vipengele/ts` `LocalDate` values; the date model is
  `docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md`. The pure model — the month
  grid, the day/week/month/year moves, bounds and `isDateDisabled`, the tab-stop choice — lives in
  `src/Calendar/calendarGrid.ts`; the focus state and keymap live in
  `src/Calendar/useCalendarFocus.ts`. `Calendar.tsx` holds only the single-day selection and the
  Clear footer; `src/Calendar/CalendarCore.tsx` renders the grid, the header, the focus handling
  and the day cells (see the range entry below).
  - `useCalendarFocus` owns the 2-D keymap, because `useRovingFocus` is one-dimensional. The tab
    stop is derived, never written to the DOM: exactly one day has `tabIndex={0}`, the last-focused
    day while its month is visible, else `calendarGrid`'s `tabStop` (the core's `tabStopAnchor`, which
    is `Calendar`'s selected day, then today, then the first enabled day). The day cells register in
    a ref map that DOM focus moves through.
  - A move off the visible month changes the month and sets a pending focus that a layout effect in
    `useCalendarFocus` applies, only if DOM focus was inside the grid. When a controlled `month`
    ignores `onMonthChange` the target is never rendered, and the pending focus is dropped.
  - Leading and trailing days of adjacent months are inert `aria-hidden` blanks and the grid is
    always six rows, so the height never changes. A disabled or out-of-range day is `aria-disabled`
    and stays focusable.
  - Clear and the month buttons use `aria-disabled`, never native `disabled`, which would drop focus
    to `body` when the button becomes unavailable; their handlers guard instead.
  - `autoFocus` is destructured out before the rest props are spread, or React also focuses the
    root `div`. `ref` and the rest props land on the root.
  - The visible month is never re-derived from `value` after the first render, which is what lets
    Clear keep the month. It handles no `Escape` and opens no portal: a pop-up around it owns
    dismissal.

- `Table` is a presentational compound component (`Table.Head`, `Table.Body`, `Table.Row`,
  `Table.Cell`, ...) with no validation of its children. The `<table>` always sits in a scrolling
  wrapper `div`: `className` and `style` apply to the wrapper, `ref` and the rest to the
  `<table>`, and `scrollRef` reaches the wrapper for callers that observe or measure it. The wrapper is a focus region (`role="region"`, `tabIndex={0}`, `aria-labelledby`
  the caption) only when a `caption` or an `aria-label` is passed — a prop check, never an overflow
  measurement. With both, the caption names the region; with only an `aria-label`, the region
  carries it as its own `aria-label`, and it stays on the `<table>` too.
  `density` (`compact`/`regular`/`relaxed`) sets cell padding from `--vpg-space-*` only, and is
  the convention for any later dense component. `stickyHeader` pins via `--vpg-layer-sticky` and
  needs a bounded wrapper height, set through `className`/`style`; column alignment is a per-cell
  `align` prop, not `<colgroup>`. See `docs/adr/0027-table-density-scroll-region-and-sticky-layer.md`.

- `DataTable` is a data-driven generic function component (`columns` + `rows`), like `Tree`, not
  compound. It renders through `Table`'s parts and never leaks the engine's types: its public
  types are the package's own, which `api-check/run.mjs` enforces. `@tanstack/react-table` is a
  regular dependency, and `bundle-check/` asserts it stays out of every bundle that does not
  import `DataTable`. See `docs/adr/0046-datatable-takes-tanstack-table-as-its-behaviour-engine.md`.
  Row selection (`selectionMode`, controllable `selectedRowIds`/`onSelectionChange`) holds row ids
  from `getRowId`, so a selectable table supplies it (the index default names a position). The
  engine's `rowSelectionFeature` is controlled state only: `nextSelection` rebuilds the id list
  because a record orders integer-like keys numerically, so newly selected ids are ordered from
  the drawn rows, not the record. Shift range selection is DataTable's own
  (`enableRowRangeSelection: false`) and runs over the drawn rows. Rows carry no `aria-selected`;
  the checked Checkbox/RadioButton is the signal. Select-all and Shift range selection cover the
  drawn page of a `paginated` table, while the selection itself persists across pages.
  `paginated` renders `Pagination` below the table over controllable `page`/`pageSize`, held by
  `usePaginationState`. The page is clamped into range at render and no effect reports it, so
  never add one; only the setters call `onPageChange`. A header sort change returns a client-mode
  table to page 1. `manual` covers paging as well as sorting: `rows` is then the current page,
  drawn whole, and `totalItems` supplies the count across every page.
  `resizableColumns` (default off, which leaves the `auto` layout and every size prop untouched)
  switches to `table-layout: fixed`. Column sizes (`columnSizes`/`defaultColumnSizes`/
  `onColumnSizesChange`, pixels by column id) are held by `useColumnSizing`, clamped into each
  column's `minSize`/`maxSize` at render (defaults: `size` 150, `minSize` 20, no `maxSize`), and
  reach the engine's `columnSizingFeature` as controlled state; an out-of-range size is drawn
  clamped and never reported. Those sizes are bases: `useAvailableWidth` measures the scroll
  container's content width less the selection header cell's (whole pixels, a `ResizeObserver`
  flushed per `.agents/rules/measure-real-layout-in-a-flushed-layout-effect.md`), and
  `drawColumnSizes` draws a column with an entry, or with `resizable: false`, at exactly its base
  and has `stretchColumnSizes` share what the measured width leaves beyond those among the other
  data columns, in proportion to their bases, up to each `maxSize`; a shortfall, or no column
  left to share, keeps the bases and the table scrolls. Sized columns being exact is what makes a
  drag move the column's edge 1:1 with the pointer: a resize sets the column's entry, which pins
  it at the dragged width, and only columns without an entry absorb the difference. The hook
  returns the bases (`columnSizes`, what `onColumnSizesChange` reports) and the stretched
  `drawnSizes`, each keeping
  its identity until a width changes, so row measurement can depend on `drawnSizes`. Each data
  column's `<th>` carries its drawn width inline (`border-box`), with no `<colgroup>`; the scroll
  container takes `vpg-data-table-fixed` and the inline `--vpg-data-table-columns-width`, the
  drawn widths' sum, and the table is exactly that sum, never `100%`. A fixed table grows to the
  sum of its columns, so the selection column adds its own width; the browser shares a table's
  surplus among every column, the selection column included, so the table is never set wider
  than its columns. Until the container is measured (server markup, jsdom) the table is as wide
  as the bases. The selection column is never sized or resized.
  Each resizable column's `<th>` (`vpg-data-table-resizable`, `position: relative`) holds a
  `DataTableResizeHandle` after the sort button, never inside it, so no drag or key on it sorts:
  a focusable `role="separator"` strip on the cell's trailing edge (`inset-inline-end`, inside the
  cell's clipping), named by `aria-labelledby` as its own "Resize" plus the header's content. The
  `<th>` is then named by that same content element: a name from content would take in the
  handle's value. `aria-valuemax` is `Number.MAX_SAFE_INTEGER` for a column with no `maxSize`,
  because an omitted one reads as `100` and clamps the value assistive technology announces. A
  drag captures the pointer and calls `setColumnSize` on every move from the drawn width at the
  press, its sign flipped when the handle's computed `direction` is `rtl`; the arrow keys step 10
  (Shift 50) pixels, flipped the same way, Home and End go to `minSize` and `maxSize` (End does
  nothing without one). Its real drag, keyboard and geometry tests are in
  `DataTable.browser.test.tsx`, which drives Chromium's input through `cdp()` so pointer capture
  is real.
  `virtualized` (default off) with a required `rowHeight`, the estimated body-row height in CSS
  pixels, windows the drawn rows through `@tanstack/react-virtual`; `bundle-check/` asserts the
  DataTable bundle carries `@tanstack/virtual-core`. The prop types require a `caption` or an
  `aria-label`, because the scroll container is then a focusable region that needs a name.
  - `useVirtualizer` runs in `useRowWindow.ts` against the scroll container. `scrollMargin` is the
    body's offset within the container's content (the header above it), and the items are keyed by
    row id (`getItemKey`), so a measured height follows its row when the drawn rows reorder.
    Rows are at `rowHeight` until mounted and at their measured height from then on
    (`measureElement`); a changed `rowHeight` re-measures. Nothing is windowed while `loading` or
    with no rows.
  - `DataTableBody` mounts only the windowed rows (`rowWindow`) between two `aria-hidden` spacer
    rows, plus a spacer where two mounted rows are not adjacent. The spacers hold the height of
    the unmounted rows, so the native table keeps its column layout.
  - A focused row is pinned: the body's `onFocus`/`onBlur` report the focused row's id, and the
    `rangeExtractor` adds that row's index to the window, so a row scrolled out of view keeps its
    DOM focus. Focus is tracked by id, never by index, so it survives a sort or page change.
  - A windowed table carries `aria-rowcount` (the header row plus every row of the whole set, across
    pages when `paginated`) and each mounted row `aria-rowindex`, the header row being 1.
  - `onLoadMore` on a `virtualized` table turns on infinite scroll (`hasMore`, `loadingMore`,
    `loadMoreThreshold`); `paginated` wins when both reach it untyped. See
    `docs/adr/0051-datatable-infinite-scroll-is-a-virtualized-mode-with-an-effect-driven-load-more.md`.
    - `useEndReached.ts` calls `onLoadMore` from an effect, the one place a consumer callback is
      fired from an effect (`usePaginationState` never does). It compares the range's `endIndex`,
      the last row in view, never the last mounted row, which the pinned focused row distorts. The
      dedupe is a ref, re-armed by a change of `rows.length`, by `loadingMore` seen set, or by a
      header sort click once `rows` is replaced; do not move it into state. The call goes through
      `Scope.propagate` with the scope held in a ref, per
      `.agents/rules/start-consumer-io-in-the-enclosing-scope.md`, though the callback is void.
    - `rowCounts.ts` holds the pure `aria-rowcount` and empty-state rules: `-1` while `hasMore` with
      no `totalItems`, `max(totalItems, loaded) + 1` with it, `loaded + 1` once `hasMore` is
      `false`. `loadingMore` appends `aria-hidden` skeleton rows without unmounting anything;
      `loading` still replaces the body.
    - `loadMoreError` (with `loadMoreRetryLabel`) draws `DataTableErrorRow` after the end spacer: one
      `<tr>`, not `aria-hidden`, no `aria-rowindex`, outside `aria-rowcount`. `useEndReached.ts`
      returns early while an error is set, and its `retry` calls `onLoadMore` through the same
      `Scope.propagate` scope and counts as the armed state's one call. `loadingMore` wins over the
      row; with no rows it replaces `emptyState`. Focus stays on Retry while the row stays drawn;
      when the row is replaced the button is removed and the browser moves focus to `body`.
    - Sorting is the consumer's, as with `manual`, and a header sort click scrolls the container to
      the top in the click handler. Under jsdom the container has no size, so a table with rows has
      no range and never asks; the end signal is proved in `DataTable.browser.test.tsx`.

- `DateField` is a text `<input>` in a `FieldShell`, with a `Calendar` pop-up. Two values live in
  it: the draft text, free-form and possibly half-typed, and the committed `LocalDate | undefined`
  the caller owns. `onChange` fires only when they are reconciled (blur, Enter, a step, a pick,
  clear), and text that reads as no accepted date stays on screen as a rejected draft, flagged
  through `aria-invalid`. The pure parsing, stepping and caret-segment logic lives in
  `src/DateField/dateFieldEditing.ts`. The visible input has no `name`; a sibling hidden input
  carries the ISO value under `name`, so a server never parses a locale string.
  - The calendar host is a non-modal `Popover` on every viewport width, positioned against the
    `FieldShell`'s whole box through `Popover`'s `anchor` and `bottom-start`; on a narrow screen
    floating-ui shifts it to stay on screen. The calendar button states its own `aria-expanded`;
    the panel is no dialog. A press on the input is an outside press, so it closes the panel and
    focuses the input.
  - The open state and the visible month live in `useCalendarPopup` (`src/internal/useCalendarPopup.ts`). The `Popover` reads its
    `returnFocus` ref as the panel closes: a pick calls `closeOnto(input)`, which repoints the ref
    just before closing, and every opening aims it back at the button, so `Escape` and an outside
    press return there.
  - `withSeparator` (in `dateFieldEditing.ts`) rewrites only a single character appended at the end
    of the text: it adds the locale's separator after a completed day or month (never after the last
    field) and drops a hand-typed separator that repeats the one already there. The box's
    placeholder is `formatHint(locale)`.
  - The calendar button's mousedown is left alone so the input's blur commits a typed date before
    the calendar opens on it. The clear button prevents its mousedown default, so a press does not
    blur-commit and then commit again.

- `DateTimeField` is one `FieldShell` holding one text `<input>`, a calendar button and a clear
  button, editing one `LocalDateTime | undefined`. It composes no `DateField` or `TimeField`. The
  pure rules live in `src/DateTimeField/dateTimeFieldModel.ts`; the name, the one-shell design and
  the commit rule are `docs/adr/0049-datetimefield-naming-and-commit-rule.md`. It ships a
  stylesheet of its own.
  - The text is the date as `LocalDate#format` writes it and the time as `LocalTime#format` writes
    it, ordered the way `LocalDateTime#segments` orders them, joined by one space
    (`dateTimeSegments`); the seconds are never written. It is read back with `tryParseLocalized`
    (the field's own layout, then the locale's combined `LocalDateTime#format` layout, then ISO
    8601). The placeholder and `aria-description` are derived from the same segments.
  - `onChange` fires on commit only (blur, Enter, a pick naming a whole date-time, clear). Text that
    reads as nothing, or outside `min`/`max`, is `rejected`: nothing is reported, the text stays
    and the input is `aria-invalid`. `commitText` treats text equal to the committed value's own
    text as unchanged, so a committed second survives a blur.
  - Picking a day (`pickDate`) takes the committed time when that is inside the bounds; otherwise
    the day is pending (`pending` state), nothing commits, and `pickTime` commits the two together.
    `isPendingFlagged` flags a pending day only once `focusLeft`, set when focus leaves the shell
    and the pop-up (`panelRef` covers the portal) and cleared by focus entering either.
  - `min`/`max` are `LocalDateTime`. `dateBounds` hands the calendar their dates; `timeBounds`
    hands the `TimePanel` a bound's time only on that bound's own date, and `TimePanel` is
    `disabled` while there is no day.
  - A controlled field with no value is `undefined` to the caller but `null` inside
    `useControllableState`, whose own `undefined` means "uncontrolled". A controlled value moving
    on beneath an unfocused field drops a rejected draft and a pending day
    (`useClearRejectedOnExternalChange`).
  - The pop-up state is `useCalendarPopup`, as `DateField`'s. `ref` and the native attributes land
    on the visible input; the hidden input carries `name` and the ISO date-time. There is no
    `seconds`, `dateLabel` or `timeLabel`.
  - The text layout comes from `LocalDateTime#segments` plus a locale-order probe in the model;
    vipengele/react#192 tracks reading an exported layout from `@vipengele/ts`
    (vipengele/typescript#144).
- `RangeCalendar`, `DateRangeField`, `TimeRangeField` and `DateTimeRangeField` are the range
  siblings of `Calendar`, `DateField`, `TimeField` and `DateTimeField`; the decisions are
  `docs/adr/0052-date-and-time-ranges.md`. Rules every one of them shares:
  - A committed range always has `start <= end`; equal ends are valid. A time range never wraps
    midnight: an end before the start is reversed, never "tomorrow". `isOrdered` in
    `src/internal/localRange.ts` is the one check.
  - The calendar swaps and a field rejects. A second `RangeCalendar` pick before the anchor swaps
    the two days. In a field an end before the start flags both editors `aria-invalid` at once,
    commits nothing and keeps the drafts; a field never reorders what was typed.
  - `onChange` fires only when both ends are committed and ordered, and with `undefined` when both
    are cleared. A half-filled range is incomplete: nothing commits and the committed range
    stands. There are no open-ended ranges. The incomplete flag waits for the user to stop working
    on the pair: `DateRangeField` flags once focus is out of the editors and the pop-up is closed,
    `TimeRangeField` once focus has left the field, `DateTimeRangeField` once it has left the
    editors, buttons and pop-up together (`useFocusLeft`, `panelRef` covering the portal).
  - A range field has no `name` prop (the props type omits it) and its visible editors carry no
    `name`: `startName` and `endName` each render one hidden input with that end's ISO 8601 string,
    and an absent prop renders none. Both mirror `disabled`.
  - `LocalRange<T>` is `src/internal/localRange.ts`'s own type, never `@vipengele/ts`'s; only the
    `DateRange`, `TimeRange` and `DateTimeRange` aliases are exported, so no public signature
    names a dependency's range type.
  - Names compose. The outer `FieldShell` control is a `role="group"` that takes `FormField`'s
    label (`FormField` decorates exactly one child). Each inner editor sets `aria-labelledby` to
    the group's label (`aria-labelledby`, else the group's own id when it carries `aria-label`)
    followed by its own hidden `startLabel`/`endLabel` span ("Start", "End"). `TimeRangeField`'s
    inner editors keep their own `role="group"`, so its groups nest.
  - Disabled days, `min` and `max` refuse a day only as an endpoint; a span may cross them.
- `RangeCalendar` wraps `CalendarCore` (`src/Calendar/CalendarCore.tsx`), which owns everything
  but the selection: the grid, header, weekday row, focus and day cells. A selection reaches it as
  `tabStopAnchor`, `dayMarks` (`aria-selected`, `data-*` and pointer handlers per day; the core's
  own attributes and handlers win), `onPick` (never called for a disabled day) and `footer`.
  `Calendar` is a thin wrapper of the same core and takes no `selectionMode`.
  - `value` and `anchor` are each controlled exactly when their prop is passed (`"value" in props`).
    A pick with no anchor sets the anchor and calls `onAnchorChange(day)`; the next pick calls
    `onChange(range)` and then `onAnchorChange(undefined)`. `onChange` fires even when the range
    equals the current one. A pick after a completed range anchors afresh. The tab stop falls back
    to the anchor, then the range's start.
  - A pending anchor replaces the committed range on screen. The `data-preview` span runs from the
    anchor to whichever of the hovered and the focused day moved last, falling back to the other
    when one goes away. Every day cell carries `data-date` (ISO), which the focus handler reads.
  - The pure rules (`pickDay`, `dayState`) are in `src/RangeCalendar/rangeSelection.ts`.
- `DateRangeField` and `DateTimeRangeField` open a non-modal `Popover` from `useCalendarPopup`,
  reused as it is, and anchor a `RangeCalendar` to the typed text: a start typed beside an empty
  end is the calendar's `anchor`, and `onAnchorChange` writes the first pick into the start editor
  and empties the end editor.
  - `DateRangeField`: the first pick fills the start and keeps the pop-up open; the second commits
    the range, closes the pop-up and focuses the end editor (`closeOnto`). Models:
    `dateRangeFieldModel.ts`, which reads each text with `DateField`'s `parseDateInput`.
  - `DateTimeRangeField`: the pop-up holds the calendar, a `TimePanel` per end (disabled until the
    end has a day, bounded by `timeBounds`) and Done. A picked day keeps its editor's time, else
    the committed one; with none, or one the bounds rule out, the day is pending (text shows the
    day alone). It commits as soon as both days and both times are usable and ordered, in the pick
    that completes them and without closing; Done closes onto the end editor. A same-day end time before the start
    time is rejected, not swapped. Models: `dateTimeRangeFieldModel.ts`, which duplicates
    `DateTimeField`'s private placeholder and format-description helpers, and the component file
    `useTimeDisabled` and `isCommitKey`, rather than importing them.
- `TimeRangeField` runs two `useTimeField` instances, one per editor, each controlled by the
  field's per-end state; `timeRangeFieldModel.ts` decides the pair from `commitTimeState`
  readings. Arrow keys and a filled last segment cross between the editors through
  `useTimeField`'s `onExitPast(edge)` option, which `timeFieldKeys.ts` calls when an arrow points
  past the first or last segment. `TimeField` leaves it unset (no move, and a filled last segment
  commits without `flushSync`); set, filling the last segment `flushSync`s the commit before
  `onExitPast("end")`, so the blur that follows reads the committed state. It has no `readOnly` or
  `required`, as `TimeField` has none; `DateRangeField` and `DateTimeRangeField` have both.
  - Browser tests of `RangeCalendar`-based fields: a cursor left over from an earlier test's
    `userEvent.hover` fires pointer events when the calendar re-renders under it and changes the
    preview. A day's background has a colour transition, so assert it with `expect.poll`.
- `Popover` takes `modal` (default `true`). Modal, it traps focus, is a `role="dialog"` and merges
  `aria-haspopup`/`aria-expanded`/`aria-controls` onto its single element child. `modal={false}` is
  a disclosure-style flyout: focus still moves in on open and returns on close, but Tab can leave.
  Focus moving to another element in the document closes it; focus leaving the document (nothing
  after the panel, as with the `SideNav` rail flyout, or the window losing focus) does not, while
  `Escape` and an outside press always do. The page stays exposed, and neither the panel nor the
  trigger carries dialog semantics. A non-modal trigger is never cloned, so the caller sets its own
  `aria-expanded`. `returnFocus` is a ref read as the panel
  closes, so a caller can repoint it just before closing; it defaults to the trigger. `anchor` is a
  ref to the element the panel is positioned against instead of the trigger (floating-ui's
  separate position reference): the trigger keeps the click and dismiss wiring, and a press on the
  anchor outside the trigger is an outside press. `placement` also takes `top-start` and
  `bottom-start`, flush with the anchor's inline start edge. On the render that mounts the panel
  it is fixed at the viewport origin (`UNMEASURED_STYLE`), because floating-ui holds the element
  one render later and content that focuses or scrolls itself on mount would otherwise scroll the
  page to the offset parent's origin.
- `SideNav` is a compound component (`SideNav.Item`, `SideNav.Section`, `SideNav.CollapseToggle`)
  over a `<nav>` landmark. It never reads the location: the caller marks the page with `current` on
  an `Item`, which sets `aria-current="page"` and opens every enclosing section through a layout
  effect. `Item` is polymorphic (`as`, default `<a>`) for a router's link component. Collapse is
  controlled (`collapsed`) or uncontrolled (`defaultCollapsed`) through `useControllableState`.
  A `Section` is a labelled `role="group"` by default: a muted heading above rows that are always
  visible, at the group's own level. With `collapsible` it is a `Disclosure` indented one step per
  level docked, and a top-level one is one icon button opening a non-modal `Popover` flyout of its
  rows in the rail. In the rail an `Item` is its icon with the label visually hidden and shown as a
  `Tooltip`, and a group's heading is visually hidden with a rule above the group. The nav is
  `height: 100%`, and `CollapseToggle placement="bottom"` pins it to the nav's end with an auto
  margin on its tooltip wrapper. The rail's tooltips wrap their
  child in a fragment so `Tooltip` does not clone `aria-describedby` onto a control the label
  already names. A collapsed section's rows stay mounted in a hidden container while the flyout is
  closed, so a `current` item inside still reports to its section.
  - Below `mobileBelow` (a CSS length, default `"48rem"`, matched as `(width < mobileBelow)` by
    `src/internal/useMediaQuery.ts`) the `<nav>` renders inside a modal left `Drawer` named by its
    `aria-label`. There `collapsed` is ignored, `CollapseToggle` renders nothing, collapsible
    sections render docked with no flyouts or tooltips, and activating an `Item` closes the drawer.
    The docked and drawer forms are different subtrees, so crossing the threshold remounts the rows.
  - The mobile state (`mobileOpen`, `defaultMobileOpen`, `onMobileOpenChange`, `mobileBelow`, the
    query and the drawer id) belongs to `SideNav.Provider`, placed above the nav and the header
    holding `SideNav.MobileToggle`; a provider-less `SideNav` owns its own. A mobile prop on a
    `SideNav` inside a provider throws, as does a `MobileToggle` outside one. Widening the viewport
    while the drawer is open reports `onMobileOpenChange(false)` once.
  - Until the query resolves the nav renders docked. With the default `mobileBelow` only, the nav
    and toggle carry `data-vpg-side-nav-unresolved` and the stylesheet's `@media` rules show one
    form in server HTML; a custom `mobileBelow` gets the docked nav and no toggle until mount. Only
    `renderToString` observes the unresolved state. See
    `docs/adr/0045-sidenav-owns-its-responsive-switch.md`.
- `TopNav` is a compound component (`TopNav.Item`) over a `<nav>` landmark, `aria-label` default
  `"Main"`. Like `SideNav` it never reads the location: `current` on an `Item` sets
  `aria-current="page"` on its row link and on its overflow menu row. `TopNav.Item` is the only
  allowed child; `readItems` validates at render, unconditionally, and throws naming the offender.
  Fragments are flattened and falsy children dropped. `Item` is polymorphic (`as`, default `<a>`,
  where `href` is required); `href` is forwarded to an `as` component, which must apply its own
  destination after spreading its rest props. `start` and `end` render outside the measured row and
  never collapse. The row is an `Inline` with `wrap={false}`, collapsed from its end through
  `useOverflowCollapse`, measured in place under `data-measuring`; the stylesheet supplies the
  `data-collapsing`, `data-hidden` and `data-measuring` rules. The overflow `<li>` renders even with
  nothing hidden, because the measurement reserves the trigger's width. The trigger (`overflowLabel`,
  default `"More"`) is passed as the `Menu` `trigger`: `Menu` carries the ref and click handlers on
  its own `.vpg-menu-trigger` span, and clones the button only to merge the popup ARIA attributes.
  Hidden items render as `Menu.LinkItem` rows. `MenuLinkItem` is imported from `internal/menuPanel`
  rather than read off `Menu.LinkItem` at module level: that read is not provably side-effect free,
  and would keep `Menu` in a Button-only bundle. The measure key compares labels by text, so a
  non-text label change (an icon swapped) re-measures only on the next resize.

- `Toast` is the package's one imperative API (`docs/adr/0032-toast-is-the-one-imperative-component-api.md`),
  split in two so the common call stays free of React. `src/Toast/toaster.ts` is a plain-TypeScript
  store: the queue (three visible, the rest FIFO; while a toast is queued and every visible one is
  persistent, the oldest visible one is dismissed to make room), the timers with their remaining time across
  pause and resume, region registration, and the `toast` handle. It imports nothing from React.
  `ToastRegion.tsx` reads a store with `useSyncExternalStore` and renders it.
  - `toast` is `/* @__PURE__ */ createToastHandle(…)` and the default toaster is created on its
    first call, so importing `toast` creates nothing and is dropped from a bundle that never calls
    it. `getDefaultToaster` is the region's way in and `peekDefaultToaster` exists for tests; neither
    is exported from `src/index.ts`. `bundle-check/` asserts the unused-`toast` bundle holds no
    toaster code.
  - A raise with no registered region is a no-op with one development `console.warn` per toaster;
    unregistering the last region drops every toast. A second region on one toaster warns.
  - The region is a `popover="manual"` element in an own host element. `useModalSurfaceHost`
    moves the host into the topmost open modal surface (`[data-vpg-overlay-root][open]`), because a
    modal surface makes everything outside it inert, a top-layer popover included; it moves with
    `moveBefore` where the engine has it, so the toasts keep their nodes and animations
    (`docs/adr/0024-overlay-layering-and-portal-ownership.md`). Its suite is browser-only.
  - The live region is a separate visually hidden announcer beside the popover, never inside it, so
    hiding and showing the popover to repaint above a modal surface announces nothing again. The
    `+N more` queue count (`.vpg-toast-queued`) is plain text, never live: a queued toast is
    announced when it becomes visible.
  - `Escape` inside the region stops propagation and prevents default, so the overlay tree's
    `document` listener and a modal `<dialog>`'s `cancel` never see it. `useSwipeDismiss` holds the
    swipe gesture; the hotkey is matched on `event.key`, with the physical key as a fallback for a
    single letter.
  - A click on a toast action is an outside press for a non-modal `Drawer` with
    `closeOnOutsideClick`; the region offers no exemption and the README documents the limit.
  - Status tones draw on the `-wash` and `-contrast` tokens, never a status colour as text or
    border (`docs/adr/0033-status-colours-extend-beyond-danger.md`). Tests: `toaster.test.ts` and
    `ToastRegion.test.tsx` (jsdom), `ToastRegion.browser.test.tsx` and
    `useModalSurfaceHost.browser.test.tsx` (real layout, top layer, inertness).

## `bundle-check/`

`bundle-check/` is a real downstream Vite build asserting that importing one component from this
package's built `dist/` pulls in only that component. **Every new component must be added to it
in the same change that ships the component** — a check that names only the components that
existed when it was written proves nothing about the one just added, and stays green while it
stops covering the package.

## Coverage

`vitest.config.ts` sets 80% thresholds on statements, branches, functions and lines, and
`pnpm test` fails below them. A component is designed for the behaviour it should have, never for
what is cheaper to test; the threshold leaves room for that, and is not a target to write tests
down to. A reachable branch never takes a `v8 ignore` pragma: it is tested or it stays visibly
uncovered. `docs/adr/0048-ui-coverage-gate-is-80-percent.md` records why, and what of
`docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md` still holds.

## Two Vitest projects

`vitest.config.ts` runs two projects. A `*.test.tsx` file runs under `jsdom`; a
`*.browser.test.{ts,tsx}` file runs under a real headless Chromium instead, driven by
`@vitest/browser-playwright`. See `.agents/rules/browser-test-for-anything-jsdom-cannot-resolve.md`
for which kind a given assertion belongs in.

A fresh clone fails `pnpm test` until Playwright's Chromium build is installed by hand — Playwright
ships no postinstall hook to fetch it:

```bash
pnpm --filter @vipengele/react-ui exec playwright install chromium
```

Run it filtered to this workspace, not as a bare `pnpm exec playwright install chromium` from the
repo root: pnpm's isolated `node_modules` keeps a workspace's own devDependency out of the root
bin directory, so the bare form fails with `Command "playwright" not found`.
