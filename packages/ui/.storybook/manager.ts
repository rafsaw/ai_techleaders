import { addons, internal_checklistStore, internal_universalChecklistStore } from "storybook/manager-api";
import { create } from "storybook/theming";

// Only the product name is visible in the UI; the base (Storybook, shadcn/ui on Base UI) is
// recorded in the technical note on Design system/Contributing (prompt rule 10).
addons.setConfig({
  theme: create({ base: "light", brandTitle: "DevMentor", brandUrl: "./" }),
  sidebar: { showRoots: true },
});

// Rebrand what Storybook itself writes: the tab title ("<page> ⋅ DevMentor"), the
// screen-reader-only page heading and the preview frame's accessible name.
const rebrand = () => {
  const title = document.title.replace(/Storybook/g, "DevMentor");
  if (title !== document.title) document.title = title;
  const heading = document.getElementById("global-site-h1");
  if (heading && heading.textContent !== "DevMentor design system") heading.textContent = "DevMentor design system";
  const frame = document.getElementById("storybook-preview-iframe");
  if (frame && frame.title !== "Preview") frame.title = "Preview";
};
new MutationObserver(rebrand).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
rebrand();

// Turn off Storybook's onboarding checklist widget once its store is ready (prompt rule 10).
void internal_universalChecklistStore.untilReady().then(() => internal_checklistStore.disable(true));
