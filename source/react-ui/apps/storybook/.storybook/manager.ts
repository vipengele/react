import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// Replace Storybook's own branding in the sidebar header with the brand
// lockup. The logo is served from @vipengele/brand via `staticDirs` in
// main.ts, which mounts it at /brand. The light variant is used because the
// manager runs on Storybook's default light chrome, and the horizontal lockup
// because the sidebar header is far wider than it is tall.
//
// The path is relative: the site is deployed under a per-project subdirectory
// (.github-pages), where a root-absolute path would resolve above it.
const theme = create({
  base: "light",
  brandTitle: "Vipengele React",
  brandImage: "./brand/vipengele-logo-horizontal.svg",
  brandTarget: "_self",
  // The sRGB equivalent of @vipengele/react-tokens' default seed accent
  // (oklch(0.58 0.19 264), createTheme()'s --vpg-accent). Storybook's
  // manager derives hover/focus shades from this via `polished`, which only
  // parses hex/rgb/hsl — an oklch() string here crashes the whole manager
  // with an uncaught PolishedError the moment it renders (parseToRgb has no
  // oklch branch), not just a degraded derived shade.
  colorPrimary: "#3e71e9",
  colorSecondary: "#3e71e9",
});

addons.setConfig({ theme });
