import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// Replace Storybook's own branding in the sidebar header with the Tandiko
// lockup. The logo is served from @tandiko/brand's assets/dist via
// `staticDirs` in main.ts, so it resolves at the manager root. The light
// variant is used because the manager runs on Storybook's default light
// chrome.
const theme = create({
  base: "light",
  brandTitle: "Tandiko Design System",
  brandImage: "./tandiko-logo.svg",
  brandTarget: "_self",
  // The sRGB equivalent of @tandiko/tokens' default seed accent
  // (oklch(0.58 0.19 264), createTheme()'s --tandiko-accent). Storybook's
  // manager derives hover/focus shades from this via `polished`, which only
  // parses hex/rgb/hsl — an oklch() string here crashes the whole manager
  // with an uncaught PolishedError the moment it renders (parseToRgb has no
  // oklch branch), not just a degraded derived shade.
  colorPrimary: "#3e71e9",
  colorSecondary: "#3e71e9",
});

addons.setConfig({ theme });
