# @tandiko/brand

**Build. Host. Scale. Together.**

The full, visual brand guide lives in **`./guide.html`** (open in a browser; print to PDF via ⌘/Ctrl-P — eight letter pages). This file is a quick reference for engineers dropping the brand into product, sites, and docs.

## Using from code

Import the **outlined, self-contained** vectors (font-independent — these are the ones to ship):

```ts
import logo from "@tandiko/brand/svg/tandiko-logo-notagline.svg";
import mark from "@tandiko/brand/svg/tandiko-mark.svg";
```

`./svg/*` resolves to `assets/dist/*` (outlined). The editable text sources are at `./svg-src/*` (`assets/src/*`) and the brand TTFs at `./fonts/*`.

Rasterize any vector on demand via the bundled bin (uses `@resvg/resvg-js`):

```sh
yarn tandiko-brand-png node_modules/@tandiko/brand/assets/dist/tandiko-mark.svg 192
```

Regenerate the outlined `dist/` from the text sources (maintainers, after editing `assets/src/`):

```sh
yarn workspace @tandiko/brand build   # outlines <text> → <path> using the brand fonts
```

---

## Logo

A cloud that holds a **T**. The cloud is the platform, drawn as an open outline; the T is folded from a single ribbon and breaks the cloud's edge at the bottom — what you build on tandiko is yours and leaves the platform.

| Lockup                   | Use                                                                   | Files                                                    |
|--------------------------|-----------------------------------------------------------------------|----------------------------------------------------------|
| **Primary**              | Covers, first pages, signage — where the brand is being introduced    | `tandiko-logo.svg`, `tandiko-logo-onDark.svg`            |
| **Compact** (no tagline) | **The product default** — web, headers, sign-in, anything small       | `tandiko-logo-notagline.svg`, `…-notagline-onDark.svg`   |
| **Mark**                 | App icons, avatars, favicons, loading states — name already present   | `tandiko-mark.svg`                                       |
| **Wordmark**             | Where the mark is already present                                     | `tandiko-wordmark.svg`                                   |
| **Mono**                 | One-colour cuts of every lockup and the mark                          | `…-mono-ink.svg`, `…-mono-white.svg`                     |

**On dark:** wordmark white, tagline `#9AA3B2`, mark unchanged — for grounds darker than `#2A3145`. **Mono ink** for engraving, embroidery, single-plate print; **mono white** for photography and solid colour fields.

**Clear space:** `2X` on every side, where `X` is the cloud's ring weight (62 units on the master grid). It scales with the logo.

**Minimum size**

- Primary lockup — **260px / 70mm** (below this the tagline drops under 5pt; use compact)
- Compact lockup — **120px / 32mm**
- Mark — **24px / 8mm**; at **16px and below** use the mono mark

**Never:** stretch, rotate, recolour the gradient, add shadow or glow, place on a low-contrast ground, box/badge/outline it, fade it, or re-typeset the name. Never use the cloud without the T or the T without the cloud. Never set the wordmark yourself — the files carry −1.2 tracking and a fixed relationship to the mark that typing will not reproduce.

---

## Color

Blue carries the brand; the neutrals carry the work.

```
Core blues
Deep       #0031AC   gradient start; headlines on light, dark UI fills
Action     #0A6FE0   the interface blue — links, primary buttons, focus (4.8:1 on white)
Azure      #1A9DF7   gradient mid; fills and charts only — never text on white
Sky        #44EBFE   gradient end; accents on dark, highlights (decorative)

Neutrals
Ink        #141A2C   body text on light
Graphite   #2A3145
Slate      #545B69   secondary text
Steel      #8A90A0   labels, 16px and above only
Line       #C9CED8
Mist       #E3E6EB
Fog        #F4F5F7   default page ground

Gradients — logo only
cloud      #0031AC → #1A9DF7 65% → #44EBFE · −10°
T          #0052D9 → #28BCFF · −15°
```

The two gradients belong to the mark — never page or panel backgrounds. Every module in an app inherits this palette; modules do not introduce brand colours of their own.

---

## Typography

| Role               | Family            | Weights                    | Use                                                         |
|--------------------|-------------------|----------------------------|-------------------------------------------------------------|
| Display / wordmark | **Poppins**       | 400 · 500 · 600            | Headlines, decks, campaign pages — nothing below 20px       |
| Text / UI          | **IBM Plex Sans** | 400 · 500 · 600            | Product UI, documentation, long copy, tables, forms         |
| Mono / technical   | **IBM Plex Mono** | 400 · 500                  | Code, endpoints, module and permission identifiers          |

All free & open-source on Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

The wordmark is **Poppins SemiBold, letter-spacing −1.2** (on the 250-unit master), always lowercase. The name is **tandiko** in the logo and in running text — never `Tandiko` in a logo position, never `TANDIKO` anywhere.

---

**Note: the SVGs in `assets/src/` use live `<text>` in Poppins and only render correctly where it is installed. Use the files from `assets/dist/` — outlined, self-contained, and intended for production.**

_tandiko Brand Guidelines · v1.0 · September 2026_
