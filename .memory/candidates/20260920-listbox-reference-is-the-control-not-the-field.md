---
about: the reference-element reasoning still holds, but the hook now supports a real-focus search mode via a non-modal FloatingFocusManager
saw:
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
targets: listbox-reference-is-the-control-not-the-field
verdict: still-true
---

The reference/position-reference split is unchanged and is now stated in the hook's own
docstring (`useListboxKeyboard.ts:102-106`): `elements.domReference` "stays ... for the whole
lifecycle, `search` mode included," because floating-ui reads it for typeable-combobox handling,
focus restore and `useClick`'s space key. `Autocomplete.tsx` is gone (component deleted); the
`Dropdown.tsx:371` trigger citation should replace it as the sole caller reference.

The closing section the note quotes (`:76-78`, "`FloatingFocusManager` is not an escape hatch
here... deliberately absent") no longer matches the hook. `search?: boolean` is now an option
(`useListboxKeyboard.ts:54-57`) whose docstring reads: "Whether the caller renders a search input
inside the floating element and gives it real focus, with `getSearchProps()` and a non-modal
`FloatingFocusManager`." The hook's top docstring states the rule directly
(`useListboxKeyboard.ts:97-100`): search mode "is the only one where the caller wraps the
floating element in a **non-modal** `FloatingFocusManager`" — modal would make the trigger and
the page behind it unreachable, which is wrong for a listbox pattern.

`Dropdown.tsx:939` is the one caller: `<FloatingFocusManager context={floatingContext}
modal={false} initialFocus={searchRef}>` wraps only the search row's floating panel
(`renderSearchPanel`, `Dropdown.tsx:933-977`), never the non-search render path
(`Dropdown.tsx:991-997`, no `FloatingFocusManager`). Virtual focus via `aria-activedescendant`
still governs which option is highlighted even in search mode — `getSearchProps()`
(`useListboxKeyboard.ts:84`) is what carries it, and `getFloatingProps()` still goes on the
`role="listbox"` element (`Dropdown.tsx:972`, `:997`), never the panel div that wraps the search
row. `Popover.tsx:131` is still the package's only *modal* `FloatingFocusManager` use.

So the surviving claim is: real DOM focus never enters the *listbox*, but in search mode it does
enter a search `<input>` that is a sibling of the listbox inside the floating panel — the
distinction the old "deliberately absent" framing collapsed. `docs/adr/0013-dropdown-is-the-one-
searchable-combobox.md` documents this mode.
