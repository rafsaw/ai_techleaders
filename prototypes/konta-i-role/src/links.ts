import { navigate } from "./sim";

/**
 * Product links are real anchors (the design system's components render <a href="/sign-in">). In the
 * prototype they open the matching screen instead of leaving the page. Returns the function that removes it.
 * The review engine's comment mode stops the click first, so a comment never navigates.
 */
export function installLinkInterception(root: Document = document): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    const href = anchor?.getAttribute("href");
    if (!anchor || !href?.startsWith("/") || !anchor.closest(".frame")) return;
    event.preventDefault();
    navigate(href);
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
