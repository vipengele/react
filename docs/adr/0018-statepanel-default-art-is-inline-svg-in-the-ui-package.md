# StatePanel's default art is inline SVG in the ui package

The default illustrations of `StatePanel` — one each for the `empty`, `error` and `not-found`
variants — are inline SVG React components in `source/react-ui/packages/ui/src/StatePanel/`.
They are not exported from the package index, and they are not assets in `@vipengele/brand`.

Their fills read role tokens — the accent, the accent wash or surface, and the muted ink — and
never a literal colour.

## Why the art is inline

Custom properties resolve in an SVG that is part of the document. They do not resolve inside an
SVG loaded through `<img>` or as a CSS background: that SVG is a separate document with no
access to the page's `--vpg-*` properties. Art that must follow the seed and the light or dark
colour mode therefore has to be inline, reading tokens from the ancestor `ThemeProvider` like
every other component (ADR-0001, ADR-0009). An illustration in literal hex would keep one palette
whatever the consumer's seed and would not switch with the colour mode.

`@vipengele/brand` (ADR-0016) is a published package of static brand assets consumed as files.
A file cannot read the consumer's theme, so the package is the wrong home for art whose whole
point is to belong to that theme.

The art is traced from a design mockup and is decorative: the panel's title and description carry
the meaning. Its markup is `aria-hidden`, so a screen reader announces the text and skips the
picture.

## Consequences

Each illustration adds bytes to the `ui` bundle, but only when `StatePanel` is imported. Because
the components are not exported from the index, a consumer who never imports `StatePanel` never
pays for them, and the bundle-check tree-shaking marker guards that.

Fills read tokens, so the art follows the theme and the colour mode with no extra work from the
consumer.

The art is not part of the public surface. A consumer wanting different art passes their own
media to `StatePanel` rather than importing these components, and the illustrations may change
shape without a breaking release.

## Considered options

- **SVG files in `@vipengele/brand`, consumed as `<img>`.** Rejected because tokens do not
  resolve inside an image-loaded SVG, so the art would be fixed in one palette and could not
  follow the seed or the colour mode.
- **A compound component or context carrying default art per variant.** Rejected because it
  drags in the runtime-validation rules of ADR-0003 for what is a static default, and adds a
  composition API to maintain.
- **Raster art.** Rejected because it does not follow the theme and is heavier than the vector
  equivalent.
