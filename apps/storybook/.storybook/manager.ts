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
  // Matches @tandiko/tokens' default seed accent (createTheme()'s --tandiko-accent).
  colorPrimary: "oklch(0.58 0.19 264)",
  colorSecondary: "oklch(0.58 0.19 264)",
});

addons.setConfig({ theme });
