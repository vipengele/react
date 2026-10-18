---
about: "TextField and Textarea have no ref of their own and pass children straight through, so a clear button must merge refs and Textarea's trailing slot is vertically centred"
saw:
  - source/react-ui/packages/ui/src/TextField/TextField.tsx
  - source/react-ui/packages/ui/src/Textarea/Textarea.tsx
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
  - source/react-ui/packages/ui/src/PasswordInput/PasswordInput.tsx
---

Read while planning issue #89; the runtime claims about native behaviour are inference, not run.

- TextField (TextField.tsx:27-44) and Textarea (Textarea.tsx:56-81) are plain function components:
  `...rest` is spread on the native element, controlled/uncontrolled is left entirely to the native
  element (no state, no `useControllableState`), `onChange` is the native React ChangeEvent handler.
  Neither declares `ref` in its props type; NumberInput does (`ref?: Ref<HTMLInputElement>` at
  NumberInput.tsx:23, with the comment that `InputHTMLAttributes` carries no `ref`) and merges the
  caller's ref with its own via `assignRef` (:115, :357-360). A clearable TextField needs its own
  input ref to refocus after clearing, so it has to adopt that same merge.
- Because TextField owns no value, "clear" cannot be `setValue("")`. Options: a native-value-setter
  plus dispatched `input` event (keeps controlled and uncontrolled both working and fires the
  consumer's onChange with a real event), or a separate `onClear`. Neither is in the repo yet;
  PasswordInput composes TextField and overrides `trailing` (PasswordInput.tsx:5,36-47, props type
  `Omit<TextFieldProps, "type" | "trailing">`), so a new TextField prop reaches PasswordInput
  unless it is also omitted.
- NumberInput already shares its trailing slot between a caller's `trailing` and its steppers,
  with the library's own controls rendered last so they stay at the trailing edge
  (NumberInput.tsx:316-326). The same ordering precedent applies to clear plus a caller `trailing`.
- Textarea: `.vpg-field-shell` has `align-items: center` (FieldShell.stylesheet.ts:34) and the slots
  are `flex: none` centred spans (:87-93), so a trailing clear button sits at the vertical middle of
  a tall or auto-grown textarea (inferred from the CSS, not checked in a browser). Top-aligning it
  needs a rule that is not in the shell. Rule `.agents/rules/browser-test-for-anything-jsdom-cannot-resolve.md`
  says layout assertions belong in `*.browser.test.tsx` (vitest.config.ts:7-8).
