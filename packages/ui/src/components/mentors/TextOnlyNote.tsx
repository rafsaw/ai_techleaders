import type { ComponentProps } from "react";

import { cn } from "@devmentor/ui/lib/utils";

// "Text sessions only" (N01, E02 Flow 2 step 4): says what a session is before anyone books.
// Plain text, no icon: no icon for text sessions is in the approved set, and video icons are
// never used (Icons, A06). Public kit only (F3). Docs: text-only-note.mdx.

export const TEXT_ONLY = "Text sessions only";

export function TextOnlyNote({ className, ...props }: ComponentProps<"p">) {
  return (
    <p data-slot="text-only-note" className={cn("text-label text-foreground", className)} {...props}>
      {TEXT_ONLY}
    </p>
  );
}
