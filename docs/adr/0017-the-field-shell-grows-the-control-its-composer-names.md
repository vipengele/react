# The field shell grows the control its composer names

`FieldShell` gives the centre's free space to the child carrying `.vpg-field-shell-control`. The
composer of the shell puts that class on the control — `TextField` on its `<input>`, `Dropdown` on
its trigger, `PasswordInput` through `TextField` — and the shell's stylesheet selects it by name:

```css
.vpg-field-shell > .vpg-field-shell-control {
  flex: 1;
}

.vpg-field-shell:not(:has(> .vpg-field-shell-control))
  > *:nth-last-child(1 of :not(.vpg-field-shell-leading, .vpg-field-shell-trailing)) {
  flex: 1;
}
```

The two rules can never both apply: the second is guarded to shells with no marked control, so no
shell has two elements at `flex: 1`.

`Dropdown`'s chip row is deliberately unmarked. It stays `flex: 0 1 auto` and sizes to its chips,
which is what leaves a remainder for the trigger to take.

## Why position cannot select the control

A rule that grows the *last* centre element grows whatever is last, and a page is free to append
to the shell. The Keeper password-manager extension appends a `<keeper-lock>` custom element as a
child of the shell; it becomes the last centre element, takes the growth, and the control falls
back to its intrinsic width — so the trailing reveal button sits beside the text instead of flush
right. This reaches real consumers, not only the Storybook.

Measured in headless Chromium, flipping the marker on the control red-to-green:

| Case | Unmarked | Marked |
|---|---|---|
| Injected element's own width, 300px field | 113px — it takes the centre | 24px — its set width |
| `PasswordInput` reveal button's inset from the field's content right edge, 700px field | 473.14px | 32px |
| `Dropdown` trigger width, `multiple` with a selection, 400px field | 32px — its `min-width: var(--vpg-size-md)` floor | 260.69px |

A marker is injection-proof in a way no positional selector is, because it travels with the
control: a node a page inserts carries no class the library put there, wherever it lands.

Two mechanisms that read as fixes do not survive measurement. `margin-left: auto` on the trailing
slot is a no-op here — `flex-grow` resolves before auto margins, so the injected element has
already eaten the free space by the time the margin has any to absorb. And the marker rule
standing alongside the positional rule with **no** guard leaves control and injected element both
at `flex: 1`, splitting the space between them. The `:not(:has(…))` guard is the whole of the
difference.

## Consequences

`.vpg-field-shell-control` joins ADR-0011's committed class-name surface as a fourth item, and it
is the first item that surface commits a *caller* to applying. `FieldShell` renders its children
as-is and never clones them, so the shell cannot put the class on a control for whoever passed it;
naming the control is the composer's job, and a shell whose composer names nothing has no control
the shell can identify.

**The unmarked positional fallback is not committed.** It exists so a shell composed before the
marker existed keeps the behaviour it had, and it carries the injection defect with it wherever it
applies. It may be removed. Marking the control is the supported way to compose a shell, and a
consumer relying on last-child growth is relying on something this ADR does not promise.

The residual, accepted and not chased: an injected element still sits in the flex line and still
picks up the shell's `gap`, so the control is that much narrower than the shell's content box. At
the default seed `--vpg-space-2` is 8px, which is why the 32px reveal-button inset above is the
injected element's 24px plus one gap rather than slack in the test.

`.vpg-field-shell-control` collides in wording with `.vpg-dropdown-control`, which sits on the
*shell* element and means "the dropdown's field" — a shell, in the glossary's terms, not a
control. The collision is pre-existing and deliberately left alone: renaming a committed class
name is its own decision, and folding it into this one would put a breaking rename inside a bug
fix.

## Considered options

- **A pure marker class**, deleting the positional rule outright. Injection-proof, and the
  stylesheet then states its intent with no second mechanism to reason about. Rejected because it
  silently stops every unmarked control from growing — the currency input, the date range, the
  search box with its own affordances that ADR-0011 exports `FieldShell` for. They would not
  error; their control would just quietly shrink to its intrinsic width.
- **Committing the positional fallback** alongside the marker, so both are supported ways to
  compose a shell. Rejected because the fallback's behaviour *is* the defect: promising it makes
  the injection failure permanent, and a consumer who reads the promise has been told to rely on
  the one path that breaks under an extension.
- **A type-scoped `of` list** —
  `:nth-last-child(1 of input, button, select, textarea, [class^="vpg-"])`. This keeps an unmarked
  plain-`<input>` consumer working with no change on their side. Rejected because it encodes a
  guess about what counts as a control, and the guess fails on the case that prompted it: an
  extension injecting an `<input>` or a `<button>` is in the list and takes the growth exactly as
  `<keeper-lock>` does. It fixes Keeper, not injection.
- **`data-vpg-field-control` as an attribute** rather than a class. Rejected because ADR-0011's
  committed surface is stated entirely in class names; an attribute opens a second kind of
  committed surface for one marker, and the next such marker then has two precedents to choose
  between.
- **`.vpg-field-control`**, dropping the `-shell` segment. Rejected for breaking the family
  prefix — `.vpg-field-shell-leading` and `.vpg-field-shell-trailing` name the slots of this
  component, and the marker names a third role in the same component.
