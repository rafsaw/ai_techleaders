import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { mswLoader } from "msw-storybook-addon/csf3";
import { GLOBALS_UPDATED, SET_GLOBALS } from "storybook/internal/core-events";
import { addons } from "storybook/preview-api";

import { DocumentationArgTypes, DocumentationContainer, DocumentationControls, DocumentationStory, DocumentationTable } from "./blocks/documentation";

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
    // P-AUD1–3, proposal approved by Rafał: accessible tables, themed docs
    // controls and isolated story frames carrying the selected document theme.
    docs: {
      container: DocumentationContainer,
      components: { table: DocumentationTable, Story: DocumentationStory, Controls: DocumentationControls, ArgTypes: DocumentationArgTypes },
    },
    layout: "padded",
    // Every component and screen is checked at these widths (Foundations/Spacing and layout).
    viewport: {
      options: {
        w320: { name: "320 px", styles: { width: "320px", height: "720px" }, type: "mobile" },
        w768: { name: "768 px", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        w1440: { name: "1440 px", styles: { width: "1440px", height: "900px" }, type: "desktop" },
      },
    },
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
