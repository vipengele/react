---
about: Tabs' roving tabindex must never land on a disabled tab, or the whole tablist becomes unreachable by keyboard
saw: packages/ui/src/Tabs/Tabs.tsx
---

Roving tabindex gives exactly one tab `tabIndex={0}` and every other tab `tabIndex={-1}` — the
convention is to tie that single tab stop to whichever tab is selected. That breaks the moment
the selected tab is also `disabled`: a disabled `<button>` refuses focus regardless of its
`tabIndex`, so if the selected tab is the only one with `tabIndex={0}`, nothing in the tablist
can be reached with the Tab key at all. This can happen two ways — an uncontrolled `Tabs`
picking a disabled first tab as its default selection (`firstTabValue` originally didn't check
`disabled`), or a controlled `Tabs`/explicit `defaultValue` pointing at a disabled tab directly.

`Tabs.tsx` tracks the tab stop separately from the selection: `tabStopValue` in
`TabsContextValue` is `activeValue` unless `isTabDisabled(children, activeValue)`, in which case
it falls back to the first *enabled* tab (`firstTabValue(children, skipDisabled: true)`), or to
`activeValue` itself only if every tab in the list is disabled (a state where there is genuinely
no valid focus target, and the distinction stops mattering). `TabsTab` renders
`tabIndex={tabStopValue === value ? 0 : -1}`, not `tabIndex={selected ? 0 : -1}`. Any future
compound list-of-items component using roving tabindex (a future Menu, a Listbox) needs the same
split between "what's selected" and "what's the keyboard's single tab stop."
