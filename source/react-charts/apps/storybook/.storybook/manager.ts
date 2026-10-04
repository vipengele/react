import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// Storybook's manager derives hover/focus shades from these via `polished`, which only parses
// hex/rgb/hsl — an oklch() string crashes the whole manager with an uncaught PolishedError. The
// value is the sRGB equivalent of @vipengele/react-tokens' default seed accent.
const theme = create({
  base: "light",
  brandTitle: "Vipengele React Charts",
  brandTarget: "_self",
  colorPrimary: "#3e71e9",
  colorSecondary: "#3e71e9",
});

addons.setConfig({ theme });
