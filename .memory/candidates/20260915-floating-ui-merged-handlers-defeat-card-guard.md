---
about: floating-ui's getReferenceProps() merges its own click/keyboard handlers with the caller's, so Card's nested-interactive-descendant guard cannot be reused on a floating-ui reference element
saw: packages/ui/src/Dropdown/Dropdown.tsx, packages/ui/src/internal/useListboxKeyboard.ts
---

`Card`'s `role="button"` div guards against nested interactive descendants by checking
`event.target.closest(...)` inside its own click/keydown handler before acting. That pattern
assumes the guarding handler runs, and can decide to no-op, before anything else does.

A `@floating-ui/react` reference element (an element wired up via `useInteractions`'
`getReferenceProps()`) doesn't offer that: `useInteractions` merges every registered hook's
handlers (`useClick`, `useListNavigation`, `useTypeahead`, etc.) with whatever handler the
caller passes into `getReferenceProps({ onClick, onKeyDown })`, and there is no ordering
guarantee that lets a caller's own guard intercept a bubbled event before the hook-provided
handlers act on it.

This is why Dropdown and Autocomplete's `multiple`-mode chips (each with its own remove button)
render as plain siblings *before* the combobox trigger/input, inside a non-interactive wrapper
div, rather than nested inside the trigger element itself the way Card nests its footer content
inside its own clickable root. Nesting them inside the floating-ui reference element would
reintroduce the same nested-interactive-descendant problem Card solves for — but without a
reliable place to put the guard.
