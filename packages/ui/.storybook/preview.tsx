import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { mswLoader } from "msw-storybook-addon/csf3";
import { GLOBALS_UPDATED, SET_GLOBALS } from "storybook/internal/core-events";
import { addons } from "storybook/preview-api";

import "./preview.css";

// Self-hosted Geist (Q4). The class sets --font-sans on <html>; see globals.css.
document.documentElement.classList.add("devmentor-fonts");

const initialTheme = import.meta.env.STORYBOOK_THEME ?? "light";

// Docs-only pages (MDX without stories) never run decorators, so the theme class is also
// synced from the toolbar globals here. It always goes on <html> (prompt rule 9).
const applyTheme = ({ globals }: { globals: Record<string, unknown> }) =>
  document.documentElement.classList.toggle("dark", (globals.theme ?? initialTheme) === "dark");
addons.getChannel().on(SET_GLOBALS, applyTheme);
addons.getChannel().on(GLOBALS_UPDATED, applyTheme);

const preview: Preview = {
  // The theme class goes on <html>, so dialogs, menus and popovers rendered outside the
  // story root get it too (prompt rule 9). STORYBOOK_THEME lets the test script force a theme.
  decorators: [
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: initialTheme,
      parentSelector: "html",
    }),
  ],
  // API responses are simulated per story with parameters.msw (Mock Service Worker).
  loaders: [mswLoader()],
  initialGlobals: { theme: initialTheme },
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // Accessibility violations fail the test run (prompt, stage 1).
    a11y: { test: "error" },
    options: {
      storySort: {
        order: [
          "Design system",
          ["Start here", "Components", "How to choose", "Usage and accessibility", "Content", "What to avoid", "What is missing", "Contributing", "Epics"],
          "Foundations",
          ["Color", "Typography", "Spacing and layout", "Shape and depth", "Motion", "Icons", "Themes"],
          "Primitives",
          "Product",
          "Patterns",
          "Screens",
        ],
      },
    },
  },
  tags: ["autodocs"],
};

export default preview;
