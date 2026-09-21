import { statePanelStylesheet } from "./StatePanel.stylesheet.js";

/**
 * The warning triangle on a blob `StatePanel` shows in its `error` variant.
 *
 * The `viewBox` is a 246 x 242 box that bounds the drawing with a few units to spare: the blob's
 * crown sits at y 4, its lowest point at y 237.5, its left flank at x 5.8, and the lower spark's
 * outer cap at x 243. Every coordinate below is in that box, so a shape can be read off the
 * numbers without a transform.
 *
 * The blob is one closed path of cubics through the traced outline — round at the top and left,
 * with a waist on the right between y 48 and y 72 that the two sparks sit outside, and a wide
 * lobe below that reaching x 241. The ground ellipse is centred at (127, 218.5) with radii 109
 * and 14.5, so its tips reach past the blob on both sides while the rest of it stays under the
 * blob. Both carry the same fill, so the two read as one mass that the ellipse widens at the
 * ground rather than as a shape sitting on a shadow.
 *
 * The triangle is drawn as the path through its three corner *centres* — (119.5, 65.8) and the
 * two at y 164 — stroked 24 wide in its own fill colour with a round join. The join is what
 * draws each 12-unit corner arc, so the body and its rounded corners are one path rather than
 * three arcs to keep in agreement, and the drawn shape spans y 53.8 to 176.
 *
 * Fills come from the class rules in `StatePanel.stylesheet.ts` rather than presentation
 * attributes, so a `var()` read resolves through the cascade like every other component's. The
 * drawing carries no meaning — the panel's title and description do — so it is `aria-hidden`
 * and out of the tab order.
 */
export function ErrorIllustration() {
  return (
    <>
      {/* React 19 hoists and de-duplicates this by `href`, so rendering the illustration inside
          `StatePanel` injects the sheet once rather than twice. */}
      <style href="vpg-state-panel" precedence="vpg-state-panel">
        {statePanelStylesheet}
      </style>
      <svg className="vpg-state-panel-art" viewBox="0 0 246 242" aria-hidden="true" focusable="false">
        <ellipse className="vpg-state-panel-art-ground" cx="127" cy="218.5" rx="109" ry="14.5" />
        <path
          className="vpg-state-panel-art-ground"
          d="M 115 4.2 C 122.2 4.2 135 6.7 142 8 C 149 9.3 151.2 9.3 157 12 C 162.8 14.7 172 20 177 24 C 182 28 184.8 32 187 36 C 189.2 40 188.8 44.7 190 48 C 191.2 51.3 193.5 54 194 56 C 194.5 58 192.3 57.3 193 60 C 193.7 62.7 196 68 198 72 C 200 76 202.5 80 205 84 C 207.5 88 209.2 92 213 96 C 216.8 100 223.7 104 228 108 C 232.3 112 236.8 116 239 120 C 241.2 124 240.7 128 241 132 C 241.3 136 241.2 140 241 144 C 240.8 148 240.7 152 240 156 C 239.3 160 238.8 164 237 168 C 235.2 172 231.3 176 229 180 C 226.7 184 225.8 188 223 192 C 220.2 196 215.3 200.8 212 204 C 208.7 207.2 207.5 207 203 211 C 198.5 215 191.3 224.5 185 228 C 178.7 231.5 172.5 230.6 165 232 C 157.5 233.4 147.7 235.6 140 236.5 C 132.3 237.4 125.7 237.8 119 237.5 C 112.3 237.3 106.5 236.1 100 235 C 93.5 233.9 85.8 232.2 80 231 C 74.2 229.8 70 231.2 65 228 C 60 224.8 53.8 216 50 212 C 46.2 208 45.3 207.3 42 204 C 38.7 200.7 33.5 196 30 192 C 26.5 188 23.5 184 21 180 C 18.5 176 16.5 172 15 168 C 13.5 164 13.3 160 12 156 C 10.7 152 8 148 7 144 C 6 140 6.2 136 6 132 C 5.8 128 6 124 6 120 C 6 116 5.8 112 6 108 C 6.2 104 6.2 100 7 96 C 7.8 92 9.7 88 11 84 C 12.3 80 13.3 76 15 72 C 16.7 68 18.2 64 21 60 C 23.8 56 28.3 52 32 48 C 35.7 44 38.3 40 43 36 C 47.7 32 53.5 28 60 24 C 66.5 20 75.5 14.7 82 12 C 88.5 9.3 93.5 9.3 99 8 C 104.5 6.7 107.8 4.2 115 4.2 Z"
        />
        <path className="vpg-state-panel-art-alert" d="M119.5 65.8 L178.4 164 L60.6 164 Z" />
        <rect className="vpg-state-panel-art-mark" x="113.5" y="95.5" width="12" height="41" rx="6" />
        <circle className="vpg-state-panel-art-mark" cx="119.5" cy="151" r="6.75" />
        <path className="vpg-state-panel-art-spark" d="M222.9 35.7 L204.1 54.3" />
        <path className="vpg-state-panel-art-spark" d="M240 75.3 L219.6 80.8" />
      </svg>
    </>
  );
}
