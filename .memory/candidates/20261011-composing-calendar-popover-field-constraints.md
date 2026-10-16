---
about: what a DateField that opens a Calendar in a Popover anchored to its FieldShell runs into - FormField clone target, Popover trigger wrapper, hook order
saw:
  - source/react-ui/packages/ui/src/FormField/FormField.tsx
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/ui/src/Calendar/Calendar.tsx
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
---
Read from code while planning DateField (nothing in the store covered it).

- `FormField` (`FormField.tsx:76`) `cloneElement`s `id`, `aria-labelledby`, `aria-describedby`, `aria-invalid` onto its single child. A DateField
  that renders `<FieldShell>` as its root would get those on the shell wrapper, not the input, so the DateField itself must accept those four as props and
  spread them to the `<input>` (NumberInput does via `...rest`, `NumberInput.tsx` `{...rest}` before the fixed props, and merges
  `aria-invalid={unparseable || outOfRange || ariaInvalid}`). FormField's `aria-invalid` is `true` only when `error` is set.
- `FieldShell` renders children as-is, never clones (`FieldShell.tsx:55-77`); trailing slot is a `<span>`, so a calendar-trigger button placed there is a
  grandchild and must style its own focus/disabled state (note field-shell-control-must-be-direct-child). The hidden input must sit inside the
  shell as a *sibling* (NumberInput `:368`), it is not the marked control and is `type="hidden"` so it takes no layout.
- `Popover` wraps its `children` trigger in `<span class="vpg-popover-trigger">` that carries the floating reference and `useClick`
  (`Popover.tsx:202-211`) and, when modal and a single element, clones aria-haspopup/expanded/controls onto it. Wrapping the whole FieldShell as the Popover
  child makes a click anywhere in the field (including into the text input) toggle the panel and, being inline-flex, shrinks the anchor
  (note popover-trigger-wrapper-shrinks-anchored-children). `Popover` has no `anchor`/`reference` prop and no `initialFocus`; the panel is the
  only focus target (modal default traps focus; `modal={false}` focus-leaves-document gotcha). So a typed-entry field with a button-opened calendar
  puts the *button* (not the input) inside Popover's children and the panel anchors to the button; `DateField` does this with a leading calendar
  button. Where focus lands on close is the one thing a caller can steer: the optional `returnFocus` ref (`Popover.tsx:59`) is read at close time.
- `Popover` content is a plain node; a `Calendar` in it cannot close the popover itself, so `DateField` uses the controlled `open`/`onOpenChange`
  form (`Popover.tsx:24-27` doc says so). `Calendar.onChange` fires on selection and never closes anything; it handles no Escape
  (see `Calendar.tsx`'s docblock), Escape is the FloatingTree `useDismiss`.
- `Dialog` portals nowhere (renders inline, `data-vpg-overlay-root`, `Dialog.tsx:112`), requires exactly one of `aria-label`/`aria-labelledby`,
  and a Popover/Calendar opened inside it portals into the dialog via `useOverlayRoot` (`useOverlayRoot.ts` closest `[data-vpg-overlay-root]`).
- `Calendar` uses `"value" in props` for controlled-empty, so DateField must pass `value={x}` always (even `undefined`) to keep it controlled,
  and not conditionally spread it.
