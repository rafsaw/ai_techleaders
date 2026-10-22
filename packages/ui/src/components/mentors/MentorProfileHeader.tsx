import type { ComponentProps } from "react";

import { cn } from "@devmentor/ui/lib/utils";

// /mentors/[id] (E02 Flow 2 step 4): the display name, one area (MD3) and the plain description
// (N02). Public kit only (F3): the area pill repeats the outline Badge look in plain Tailwind
// (Q3, Z5, B5). No rating, title or employer next to the name (A03, A08). Docs:
// mentor-profile-header.mdx. A <div>, not <header>: outside <main> a header is a second banner
// landmark next to SiteHeader; the h1 already names the page.

export type Area = "typescript" | "react" | "python";

/** The area names as the product writes them (D04, MD3). */
export const AREA_LABELS: Record<Area, string> = { typescript: "TypeScript", react: "React", python: "Python" };

export interface MentorProfileHeaderProps extends ComponentProps<"div"> {
  /** The account's display name (`users.name`, 1–100 characters). */
  displayName: string;
  area: Area;
  /** Plain text, 1–2,000 characters; line breaks are kept, never Markdown or HTML. */
  description: string;
}

export function MentorProfileHeader({ displayName, area, description, className, ...props }: MentorProfileHeaderProps) {
  return (
    <div data-slot="mentor-profile-header" className={cn("flex flex-col gap-between-groups", className)} {...props}>
      <div className="flex flex-wrap items-center gap-in-group">
        <h1 className="min-w-0 text-page-title wrap-anywhere">{displayName}</h1>
        <span
          data-slot="area-badge"
          className="inline-flex h-badge shrink-0 items-center rounded-pill border border-border px-badge-x text-label whitespace-nowrap text-foreground"
        >
          {AREA_LABELS[area]}
        </span>
      </div>
      <p className="max-w-text text-body whitespace-pre-line wrap-break-word">{description}</p>
    </div>
  );
}
