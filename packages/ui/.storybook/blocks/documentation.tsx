import { useContext, useSyncExternalStore, type ComponentProps } from "react";
import {
  DocsContainer,
  DocsContext,
  ArgTypes,
  Controls,
  Story,
  getStoryProps,
  useOf,
  type StoryProps,
} from "@storybook/addon-docs/blocks";
import { themes } from "storybook/theming";

// P-AUD1/2: proposal approved by Rafał; WCAG 1.4.3 and prompt rule 9.
// The HTML class is shared by prose, inline previews and portalled overlays.
const subscribeToTheme = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const currentTheme = () => document.documentElement.classList.contains("dark") ? "dark" : "light";
const useDocumentTheme = () => useSyncExternalStore(subscribeToTheme, currentTheme);

export function DocumentationContainer({ children, ...props }: ComponentProps<typeof DocsContainer>) {
  const theme = useDocumentTheme();
  return <DocsContainer {...props} theme={themes[theme]}>{children}</DocsContainer>;
}

// MDX overrides are supported by Storybook. Nested Story delegates to its original
// renderer, preserving inline examples, controls and real package components.
export function DocumentationStory(props: StoryProps) {
  const context = useContext(DocsContext);
  const { story } = useOf(props.of ?? "story", ["story"]);
  const settings = getStoryProps(props, story, context);
  const theme = useDocumentTheme();
  if (!settings || settings.inline) return <Story {...props} />;
  const query = new URLSearchParams({ viewMode: "story", id: story.id, globals: `theme:${theme}` });
  return (
    <div className="sb-story sb-unstyled" data-story-block="true" id={`story--${story.id}`}>
      <iframe
        key={theme}
        id={`iframe--${story.id}`}
        title={`${story.title}: ${story.name}`}
        src={`iframe.html?${query}`}
        className="w-full border-0"
        style={{ height: settings.height }}
        loading="lazy"
        allowFullScreen
      />
    </div>
  );
}

// P-AUD1: proposal approved by Rafał; WCAG 2.1.1. The table itself is the
// scroll container in preview.css, so focus belongs on it, not an inert wrapper.
export function DocumentationTable(props: ComponentProps<"table">) {
  return (
    <table
      {...props}
      tabIndex={0}
      aria-label={props["aria-label"] ?? "Documentation table"}
      className="focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
    />
  );
}

// Generated Controls/ArgTypes tables are not MDX tables, so their scroll region
// needs its own named keyboard target (P-AUD1; WCAG 2.1.1).
export function DocumentationControls(props: ComponentProps<typeof Controls>) {
  return (
    <div tabIndex={0} role="region" aria-label="Component controls" className="documentation-props overflow-x-auto focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
      <Controls {...props} />
    </div>
  );
}

export function DocumentationArgTypes(props: ComponentProps<typeof ArgTypes>) {
  return (
    <div tabIndex={0} role="region" aria-label="Component prop types" className="documentation-props overflow-x-auto focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
      <ArgTypes {...props} />
    </div>
  );
}
