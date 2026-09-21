import { statePanelStylesheet } from "./StatePanel.stylesheet.js";

/**
 * The open box `StatePanel` shows in its `empty` variant.
 *
 * The `viewBox` is a 292 x 248 box that bounds the drawing with a pixel to spare: the topmost
 * ray tip sits at y 4, the ground ellipse's lowest point at y 243.5, and the two lid flaps
 * reach x 4 and x 288. Every coordinate below is in that box, so a shape can be read off the
 * numbers without a transform.
 *
 * The box's rim is what every other part hangs off — a rhombus with a back corner along
 * y 65 between x 148 and x 161, a left corner at (32, 83), a front corner at (154.5, 103.5)
 * and a right corner at (260, 81). The two walls drop from the left, front and right corners
 * to a bottom corner at (154.5, 235), and each lid flap hinges on one of the two front rim
 * edges and folds outward. The rim's two back edges bow outward, which is why they are cubics
 * rather than lines.
 *
 * Fills come from the class rules in `StatePanel.stylesheet.ts` rather than presentation
 * attributes, so a `var()` read resolves through the cascade like every other component's. The
 * drawing carries no meaning — the panel's title and description do — so it is `aria-hidden`
 * and out of the tab order.
 */
export function EmptyIllustration() {
  return (
    <>
      {/* React 19 hoists and de-duplicates this by `href`, so rendering the illustration inside
          `StatePanel` injects the sheet once rather than twice. */}
      <style href="vpg-state-panel" precedence="vpg-state-panel">
        {statePanelStylesheet}
      </style>
      <svg className="vpg-state-panel-art" viewBox="0 0 292 248" aria-hidden="true" focusable="false">
        <ellipse className="vpg-state-panel-art-ground" cx="153.5" cy="220.5" rx="131.5" ry="23" />
        <path
          className="vpg-state-panel-art-inside"
          d="M32 83 C58 75 108 68.3 124 66 L148 65 L161 65 L168 66 C186 69 243 75.5 260 81 L154.5 103.5 Z"
        />
        <path className="vpg-state-panel-art-wall" d="M154.5 103.5 L258 83 L246 212 L154.5 235 Z" />
        <path className="vpg-state-panel-art-wall-shaded" d="M154.5 103.5 L36 83 L46 212 L154.5 235 Z" />
        <path className="vpg-state-panel-art-flap" d="M154.5 103.5 L261 81 L288 120 L288 124 Q233 139 183 147 Z" />
        <path className="vpg-state-panel-art-flap" d="M154.5 103.5 L32 83 L4 123 L4 128 Q60 144 128 148 Z" />
        <path className="vpg-state-panel-art-ray" d="M91.5 20.5 L107.5 41" />
        <path className="vpg-state-panel-art-ray" d="M137 8 L137 32" />
        <path className="vpg-state-panel-art-ray" d="M183 20 L168.5 40.5" />
      </svg>
    </>
  );
}
