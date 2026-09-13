# tandiko — Brand Assets

The full, visual brand guide lives in **`../guide.html`**; the engineer quick reference (lockups, clear space, colour, type) is **`../README.md`**.

```
assets/
  src/      editable sources — wordmark and tagline as live <text> in Poppins
  dist/     outlined, font-free — ship these (and rasterize from these)
  fonts/    the Poppins TTFs the outliner uses (auto-downloaded if missing)
  guide/    illustrations used only by guide.html (e.g. the mark's construction)
  tools/    build-svg.js (src → dist) and build-png.js (dist → PNG)
```

Every file shares one coordinate space, so the mark sits identically across all of them. See [`tools/README.md`](tools/README.md) for how the outlined set is built.
