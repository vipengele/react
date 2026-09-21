/**
 * `<StatePanel>`'s own styles, injected as an inline `<style>` rather than a `.css` import so
 * the package can stay `"sideEffects": false` (same approach as `Typography`'s stylesheet).
 *
 * Every `--vpg-*` property is *read* here through `var()` and never assigned inline by the
 * component: an inline declaration would shadow the dark-mode reassignment in
 * `@vipengele/react-tokens`'s base stylesheet. The media slot does not size its content; the
 * caller's node owns its own dimensions.
 */
export const statePanelStylesheet = `
.vpg-state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vpg-space-4);
  text-align: center;
}

.vpg-state-panel-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vpg-space-2);
}

.vpg-state-panel-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--vpg-space-2);
}
`;
