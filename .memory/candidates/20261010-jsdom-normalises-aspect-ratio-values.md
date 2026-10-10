---
about: jsdom normalises an authored aspect-ratio of 4 to "4 / 1" when it is read back from element.style
saw:
  - source/react-charts/packages/charts/src/LineChart/LineChart.test.tsx
---

`LineChart` with `aspect={4}` in a non-ready status sets `aspect-ratio: 4` on its message element.
Reading it back in jsdom (`element.style.aspectRatio`) returns `"4 / 1"`, so the assertion in
`LineChart.test.tsx` expects the normalised form, not the authored number.
