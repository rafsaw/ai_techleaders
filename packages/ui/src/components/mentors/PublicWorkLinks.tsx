import { ExternalLinkIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@devmentor/ui/lib/utils";

// /mentors/[id] (E02 Flow 2 step 4): the mentor's links to public work, shown instead of ratings
// (N02, R01.7). Each shows hostname plus path in the mono face (R01.2) and opens in a new tab with
// rel="nofollow noopener ugc"; screen readers hear "(opens in a new tab)" (E02 UI/UX). Rows are
// separated by thin lines, not cards (R01.3). Public kit only (F3). Docs: public-work-links.mdx.

/** "https://github.com/ada/ingress-fix?tab=1" → "github.com/ada/ingress-fix" (the root path "/" is dropped). */
export function linkLabel(url: string): string {
  const { hostname, pathname } = new URL(url);
  return pathname === "/" ? hostname : `${hostname}${pathname}`;
}

export interface PublicWorkLinksProps extends ComponentProps<"section"> {
  /** 1–5 absolute https URLs, in the order the mentor entered them. */
  links: string[];
}

export function PublicWorkLinks({ links, className, ...props }: PublicWorkLinksProps) {
  return (
    <section data-slot="public-work-links" className={cn("flex flex-col gap-in-group", className)} {...props}>
      <h2 className="text-section-title">Public work</h2>
      <ul className="divide-y divide-border border-y border-border">
        {links.map((url) => (
          <li key={url} className="py-list-row-y">
            <a
              href={url}
              target="_blank"
              rel="nofollow noopener ugc"
              className="inline-flex max-w-full items-center gap-in-group font-mono text-meta text-foreground underline underline-offset-4 hover:decoration-2"
            >
              <span className="min-w-0 wrap-anywhere">{linkLabel(url)}</span>
              <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
