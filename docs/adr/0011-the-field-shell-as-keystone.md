# The field shell is one component, and every text-entry control composes it

Four controls in `packages/ui` draw the same thing — a bordered, rounded, surface-filled box that
takes a focus ring, a danger border when invalid and a dimmed treatment when disabled — and each
draws it with its own mechanism. `TextField` puts the border on the `<input>` itself and drives
every state from that element's own pseudo-classes. `Dropdown` puts it on a wrapper,
`.tandiko-dropdown-control`, and reaches back into the trigger with `:has()` because the
`combobox` role and floating-ui's handlers live on the trigger, not the wrapper. `Autocomplete`
puts it on a wrapper too but drives focus from `:focus-within` and invalidity from `:has()`, a
third combination. The three agree on their border, radius and surface tokens only because
somebody kept them in agreement by hand, and they already disagree on measurements: the field
pads `0.5rem 0.75rem`, the two comboboxes pad their control `0.375rem 0.5rem`, and none of the
three declares a height at all.

**The decision: a single exported component, `FieldShell`, owns the chrome of a text-entry
control — the box, its states and its width — and the controls that have that chrome compose it
rather than redrawing it.**

## The contract

`FieldShell` is a pure wrapper. The control it decorates is passed as children:

```tsx
<FieldShell leading={<Icon name="search" />} trailing={<Spinner size="sm" />}>
  <input className="tandiko-text-field" {...rest} />
</FieldShell>
```

It does not render the field element itself, and takes no `as` prop naming one. `Dropdown`'s
centre is two siblings — a chip list and a `<div role="combobox">` trigger
(`packages/ui/src/Dropdown/Dropdown.tsx:336-364`), kept apart because a remove button nested
inside the trigger cannot reliably intercept a click ahead of floating-ui's merged handlers.
An `as` prop names one element and can express neither that pair nor any other multi-element
centre; children express both, and the shell needs no knowledge of what it wraps.

The adornment slots are props — `leading?: ReactNode`, `trailing?: ReactNode` — not compound
children. Compound children (`FieldShell.Leading`) would let a caller put any node anywhere in
the shell's subtree and in any order, which is exactly what a committed DOM shape cannot allow:
the class-name surface below is a compatibility commitment, and a commitment over a shape callers
can rearrange commits to nothing. A slot whose prop is absent renders no element at all, so a
shell with no adornments contains no empty wrapper divs.

## The committed class-name surface

Consumers style around this component, so its DOM is part of its API. What is committed is
exactly:

- `.tandiko-field-shell`, and that this element is the bordered box,
- `.tandiko-field-shell-leading` and `.tandiko-field-shell-trailing`,
- that both slots are children of the shell element, the leading one before the centre and the
  trailing one after.

Nothing else. The selectors driving the shell's states — which pseudo-class or attribute
selector reads focus, invalidity or disabledness out of the wrapped control — are internal
mechanics, free to change, and a consumer keying a rule off one of them is relying on something
this ADR does not promise.

No other public surface in this repo is stated in class names: the README, the ADRs and the rule
files commit to component names, props and tokens only. This is that commitment's first instance,
so it establishes the practice rather than following one, and the boundary drawn here — the
shape and the element that carries the border, never the state mechanics — is the shape the next
such commitment should take.

## Who composes the shell, and who does not

`TextField`, `PasswordInput`, `Dropdown` and `Autocomplete` compose it.

The explicit no-s matter as much:

- **`FormField`** sits *above* the shell, not around it. It owns the label, the hint and the
  error message and the vertical rhythm between them, and wraps whatever control it is given —
  including ones with no shell at all. Making it a shell adopter would draw a second border
  around the first.
- **`FieldSet`** is a native `<fieldset>`/`<legend>` grouping several controls. It is not a
  single control, and a group's boundary is not a field's boundary.
- **`Toggle`, `RadioButton`, `Slider` and `Button`** each draw their own chrome, sized from their
  own scale steps, and none of them is a text-entry control. A track, an indicator and a button
  face are not variants of a field box; forcing them through one would mean a shell parameterised
  until it means nothing.

## What `TextField` delegates, and what stays on the `<input>`

The shell takes the border, the background, the corner radius, the focus ring, the
`aria-invalid` border treatment, the disabled treatment, the control height, the horizontal
padding and the width.

The `<input>` keeps its own element, the `.tandiko-text-field` class name, the caller-supplied
`className`, the `...rest` prop spread and its placeholder colour.

That split is load-bearing rather than incidental.
`packages/ui/src/TextField/TextField.test.tsx:20-29` asserts that both `.tandiko-text-field` and
the caller's `className` land on the `<input>`, and that an arbitrary attribute forwards to it.
Keeping all four on the input is what lets a shell-composing `TextField` satisfy those
assertions untouched, which in turn is what makes its diff readable as one thing: where the
border lives. A rebuild that also moved the class name or the spread onto the wrapper would
change the test and the chrome at once, and no reviewer could attribute a failure to either.

The consequence a consumer has to know: the visual chrome is on the shell, so a `className`
passed to `TextField` reaches the `<input>` and cannot restyle the field's border or
background. Restyling those means a rule on `.tandiko-field-shell`, which is why that class name
is committed to.

## The shell owns width

The shell declares `width: 100%` and `box-sizing: border-box`. Every centre element is
`flex: 0 1 auto; min-width: 0`, and the last centre element alone takes `flex: 1`, so a chip row
sizes to its chips and the control beside it takes the remainder.

`TextField` is `display: block; width: 100%`. `Dropdown`'s and `Autocomplete`'s outer elements
are `display: inline-block` with no width declared anywhere; only their inner `-control` carries
`min-width: 12rem`, with no `max-width` above it. `inline-block` is a shrink-to-fit box: it is
never narrower than its own min-content, and a floor with no ceiling above it leaves that box free
to grow past its container in either of two ways that have nothing to do with how many chips it
holds. First, the `min-width: 12rem` floor wins in any container narrower than 192px, in
single-select and multi-select alike, chips or none. Second, a single chip whose label cannot
break — one word longer than the container — has a min-content that propagates straight up to the
shrink-to-fit root, so one wide chip overflows a narrow container as reliably as eight. A row of
several breakable chips does not: the row wraps within whatever width the shell leaves it, and the
control stays exactly as wide as its container. An asymmetry between the two comboboxes' chrome
mechanisms is not the cause either: both share the identical `inline-block` root and the
identical unbounded `min-width` floor. Nor does a shell that declares `width: 100%`
resolve the overflow by itself: inside a shrink-to-fit root, a percentage width resolves against
the root's own too-wide width, not against the container. What removes the overflow is a ceiling
on the root itself — `max-width: 100%` — paired with a floor that yields to a narrower container,
`min-width: min(12rem, 100%)`, and a chip capped at `max-width: 100%` of its row with its label
ellipsised rather than left to set the row's min-content.

`docs/adr/0013-dropdown-is-the-one-searchable-combobox.md` amends this for `Dropdown`: its root
becomes `display: block; width: 100%`, and the floor and ceiling above go with the shrink-to-fit
root that needed them. `Autocomplete` does not survive that ADR, so the package keeps no root in
the `inline-block` shape this section describes.

## Measurements come from the scales

The shell's minimum height is `--tandiko-size-md`, the size scale's default control step, and its
horizontal padding is a `--tandiko-space-*` step. The step is a floor rather than a fixed height,
so a centre that wraps onto a second line grows the field instead of overflowing it.

ADR-0009 sanctions a literal measurement in a component stylesheet in one case: a *container*
measurement no family carries a step for, such as a combobox's `12rem` floor
(`docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md:136-140`). Padding is not
that case — the spacing scale carries every step a field needs — so `TextField`'s
`0.5rem 0.75rem`, the two comboboxes' `0.375rem 0.5rem` and `Autocomplete`'s inner input's
`0.125rem 0.25rem` are undocumented drift, four measurements that agree with nothing. The shell
ends that drift for the controls that compose it: one padding, one height, both read from a
family, and two fields side by side align because they read the same step rather than because
the same person wrote both numbers.

## `FieldShell` is exported, and that is the exception

Shared cross-component code in this package lives in `src/internal/` and is not re-exported:
`internal/listbox.stylesheet.ts` and `internal/useListboxKeyboard.ts` are consumed by `Dropdown`
and `Autocomplete` and appear nowhere in `src/index.ts`. `FieldShell` is exported anyway.

The exception is deliberate and rests on the surface above. A consumer composing a control this
package does not ship — a currency input, a date range, a search box with its own affordances —
needs the same chrome, and the alternative to exporting it is that they re-approximate the
border, radius, focus ring and invalid treatment from the tokens and drift from the library's
fields at the first change to either. The commitment runs the other way too: a component whose
DOM is committed to is a component worth exporting, and one kept internal has no reason to fix
its shape. Read the export as the decision it is, not as an `internal/` placement somebody
forgot.

## Constraints the implementation satisfies

These are the package's standing rules, restated because the shell is bound by every one of them:

- Every `var(--tandiko-*)` read is bare, with no fallback argument.
  `packages/ui/src/no-fallback-var-reads.test.ts` globs the whole of `src` at run time, so it
  polices `FieldShell` from the moment the file exists. A token the substrate lacks is added to
  `@tandiko/tokens`, never inlined as a literal second argument.
- The component never assigns a `--tandiko-*` property through an inline `style`. An inline
  declaration beats any stylesheet rule for the same property on the same element, so an
  inline-assigned token permanently shadows the base stylesheet's mode reassignment and the
  element stops adapting to colour mode (ADR-0007).
- The stylesheet ships as a string module injected through `<style href precedence>`, as every
  other component's does, so `@tandiko/ui` stays `"sideEffects": false`.

## Considered options

- **An `as` prop: `<FieldShell as="input" {...inputProps} />`**, with the shell rendering the
  field element. This puts the border and the control on one element, which is the smallest DOM,
  and it makes the adornments unambiguous siblings of a single centre. Rejected on `Dropdown`,
  whose centre is a chip list plus a trigger that must stay siblings; `as` can name only one
  element, so the component with the most chrome to share would be the one component unable to
  use the shell.
- **Compound children — `<FieldShell><FieldShell.Leading/>…</FieldShell>`**, as `Card` and the
  comboboxes' options already do. This reads well and is the established idiom in this package
  for a component with named regions. Rejected because those components commit to no DOM, and
  this one does: compound children let a caller emit two leading slots, order them after the
  centre, or interleave arbitrary nodes, and a class-name surface promising a fixed nesting
  cannot survive a caller who can rearrange it. Two `ReactNode` props are the smaller API and the
  only one whose shape is fixed by construction.
- **Keep the chrome where it is and factor only the shared CSS** into an
  `internal/field.stylesheet.ts` that each control injects. This is the least invasive change and
  needs no new component, no new export and no DOM commitment. Rejected because the divergence is
  structural, not stylistic: the three controls disagree about which *element* carries the
  border and how each state reaches it, so a shared stylesheet would have to carry all three
  mechanisms and would leave each control's unbounded `inline-block` root — the overflow's
  cause — untouched.
- **Give the shell size variants**, mirroring `Button`'s `sm`/`md`/`lg`. Rejected because no
  control composing the shell exposes a size prop, so every variant but `md` would be unreachable
  from the library's own components and unchecked by any rendering. The height is one scale step;
  a shell that needs three earns them from a control that offers the choice.
