---
about: floating-ui marker note re-checked; claim holds, line numbers drifted
saw:
  - source/react-ui/packages/ui/bundle-check/run.mjs
targets: bundle-check-floating-ui-markers-lack-positive-control
verdict: still-true
---
Markers are still only asserted absent (`floatingUiMarkers = ["data-floating-ui","computePosition"]`
at `run.mjs:112`, loop `:113`), no positive control committed. Pointers moved: Button check is now
`:50` (note: `:42`), minify:false `:25` (unchanged), markers `:112` (note: `:94`). Spinner
check is also shifted. Telemetry marker check now exists after it, with a moduleSideEffects rule.
