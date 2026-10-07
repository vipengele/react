---
about: seeking only the height transition of the Disclosure panel in a browser test reads 0px, because content-visibility is a second transition on the same element
saw:
  - source/react-ui/packages/ui/src/Disclosure/Disclosure.stylesheet.ts
  - source/react-ui/packages/ui/src/Disclosure/Disclosure.browser.test.tsx
---

Checked 2026-10-05.

- `.vpg-disclosure-panel` transitions `height` and `content-visibility` (`allow-discrete`) together.
  `content-visibility` flips to `visible` at the start of an opening and to `hidden` at the end of a
  closing, and `hidden` applies size containment, which collapses an `auto` height to 0.
- A test that pauses and seeks only the `height` `CSSTransition` leaves `content-visibility` at its
  start value; on an opening panel it still reads `hidden`, so the measured height is 0 and the
  test fails for a reason unrelated to the animation. `Disclosure.browser.test.tsx` pauses every
  transition returned by `panel.getAnimations()` and seeks them all to half the height transition's
  computed duration; reading `getAnimations()` also flushes style, so the transitions a just-committed
  attribute change starts are already in the list.
- Seeking `currentTime` makes the mid-transition assertions independent of wall-clock timing. The
  easing is `--vpg-ease-standard`, front-loaded, so "halfway in time" is well past half the height;
  assert strictly between the start and end heights, not a fraction.
