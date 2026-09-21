import { statePanelStylesheet } from "./StatePanel.stylesheet.js";

export interface NotFoundIllustrationProps {
  /** Appended to the illustration's own class, for a caller that wants to size or space it. */
  className?: string;
}

/**
 * The magnifying glass on a blob `StatePanel` shows in its `not-found` variant.
 *
 * The `viewBox` is a 280 x 254 box that bounds the drawing with a few units to spare: the blob's
 * crown sits at y 5.5, its left flank at x 3.5, the right lobe's outer edge at x 276, and the ground
 * ellipse's lowest point at y 248.5. Every coordinate below is in that box, so a shape can be read
 * off the numbers without a transform.
 *
 * The blob is one closed path of cubics through the traced outline — a broad crown, a long left
 * shoulder that reaches x 4 between y 120 and y 150, and a right flank that draws in to a waist at
 * x 219 around y 50 before a lobe bulges out to x 276 between y 98 and y 126. The ground ellipse is
 * centred at (144.5, 231) with radii 113 and 17.5, so its tips reach past the blob on both sides
 * while the rest of it stays under the blob. Both carry the same fill, so the two read as one mass
 * that the ellipse widens at the ground rather than as a shape sitting on a shadow.
 *
 * The magnifier hangs off one centre, (118.5, 121). The glass is a disc of radius 48.5; the ring is
 * a circle of radius 56.6 stroked 16.3 wide, so its band runs from 48.5 to 64.75 and closes on the
 * glass with no seam to keep in agreement; the shine is a quarter arc of radius 33 across the
 * glass's upper left. The handle runs down-right along a radius of that same centre, from
 * (162.5, 163) to (215.5, 213), stroked 25 wide with a round cap. Starting it at radius 61 is what
 * stops the cap at the ring's inner edge instead of letting it reach into the glass, and it is
 * painted after the ring, so the heavier ink lies over the band where the two cross.
 *
 * Fills come from the class rules in `StatePanel.stylesheet.ts` rather than presentation
 * attributes, so a `var()` read resolves through the cascade like every other component's. The
 * drawing carries no meaning — the panel's title and description do — so it is `aria-hidden`
 * and out of the tab order.
 */
export function NotFoundIllustration({ className }: NotFoundIllustrationProps) {
  return (
    <>
      {/* React 19 hoists and de-duplicates this by `href`, so rendering the illustration inside
          `StatePanel` injects the sheet once rather than twice. */}
      <style href="vpg-state-panel" precedence="vpg-state-panel">
        {statePanelStylesheet}
      </style>
      <svg
        className={["vpg-state-panel-art", className].filter(Boolean).join(" ")}
        viewBox="0 0 280 254"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse className="vpg-state-panel-art-ground" cx="144.5" cy="231" rx="113" ry="17.5" />
        <path
          className="vpg-state-panel-art-ground"
          d="M 150 6 C 154.5 6.2 161.2 7 167 8 C 172.8 9 179.8 10 185 12 C 190.2 14 193.8 17 198 20 C 202.2 23 207 26.7 210 30 C 213 33.3 214.5 36.7 216 40 C 217.5 43.3 218.3 47 219 50 C 219.7 53 218.3 55.8 220 58 C 221.7 60.2 226.7 61.7 229 63 C 231.3 64.3 233 65.2 234 66 C 235 66.8 233.3 67.3 235 68 C 236.7 68.7 241.5 69.3 244 70 C 246.5 70.7 247.7 70.7 250 72 C 252.3 73.3 255.3 76 258 78 C 260.7 80 264 82 266 84 C 268 86 268.7 87.7 270 90 C 271.3 92.3 273.2 95.3 274 98 C 274.8 100.7 274.7 103 275 106 C 275.3 109 276.5 112.7 276 116 C 275.5 119.3 272.8 122.7 272 126 C 271.2 129.3 272 132.7 271 136 C 270 139.3 267.8 142.7 266 146 C 264.2 149.3 262.3 152.7 260 156 C 257.7 159.3 254.7 162.7 252 166 C 249.3 169.3 246.5 172.7 244 176 C 241.5 179.3 239.5 182.7 237 186 C 234.5 189.3 230.2 192.7 229 196 C 227.8 199.3 229.8 203.3 230 206 C 230.2 208.7 230.8 209.8 230 212 C 229.2 214.2 230 217.5 225 219 C 220 220.5 210.8 220.3 200 221 C 189.2 221.7 173.3 222.8 160 223 C 146.7 223.2 131.7 222.5 120 222 C 108.3 221.5 98 220.5 90 220 C 82 219.5 75 220.7 72 219 C 69 217.3 74.5 213.2 72 210 C 69.5 206.8 62.3 203.3 57 200 C 51.7 196.7 45 193.3 40 190 C 35 186.7 30.5 183.3 27 180 C 23.5 176.7 21.7 173.3 19 170 C 16.3 166.7 13 163.3 11 160 C 9 156.7 8.2 153.3 7 150 C 5.8 146.7 4.2 143.3 4 140 C 3.8 136.7 5.8 133.3 6 130 C 6.2 126.7 4.7 123.3 5 120 C 5.3 116.7 7 113.3 8 110 C 9 106.7 9.3 103 11 100 C 12.7 97 16.2 94.7 18 92 C 19.8 89.3 19 86.7 22 84 C 25 81.3 32.8 78.3 36 76 C 39.2 73.7 38.7 71.7 41 70 C 43.3 68.3 49 66.3 50 66 C 51 65.7 46.8 68.5 47 68 C 47.2 67.5 49.3 65 51 63 C 52.7 61 54.7 58.2 57 56 C 59.3 53.8 63.3 52 65 50 C 66.7 48 65.2 46 67 44 C 68.8 42 73.2 40 76 38 C 78.8 36 81.3 34 84 32 C 86.7 30 89.2 28 92 26 C 94.8 24 96.8 22 101 20 C 105.2 18 112.8 15.7 117 14 C 121.2 12.3 122.2 11.2 126 10 C 129.8 8.8 136 7.7 140 7 C 144 6.3 145.5 5.8 150 6 Z"
        />
        <circle className="vpg-state-panel-art-lens" cx="118.5" cy="121" r="48.5" />
        <circle className="vpg-state-panel-art-lens-ring" cx="118.5" cy="121" r="56.6" />
        <path className="vpg-state-panel-art-lens-shine" d="M86 121 A 33 33 0 0 1 116 88" />
        <path className="vpg-state-panel-art-lens-handle" d="M162.5 163 L215.5 213" />
      </svg>
    </>
  );
}
