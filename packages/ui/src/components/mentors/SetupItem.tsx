import type { ReactNode } from "react";

import { Badge } from "@devmentor/ui/components/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/card";

// One step of the /mentor setup checklist (E02 Flow 1): a title, its state in words (a badge,
// never colour alone), an optional note and exactly one next action. The badge holds one to
// three words and never wraps (P-C10); a longer state from the spec goes in the note. A small card in a short
// list of panels (card.mdx, P-C9). Docs: setup-checklist.mdx.

export type SetupStateVariant = "secondary" | "success" | "warning" | "destructive";

export interface SetupItemProps {
  title: string;
  /** The state in one to three words, e.g. "Saved", "Locked" (P-C10). */
  state: string;
  /** Badge variant per the approved mapping (badge.mdx): success, warning, destructive, secondary. */
  variant?: SetupStateVariant;
  /** One sentence: why it is locked, or the spec's full state when the badge is a short label. */
  note?: ReactNode;
  /** The one next action (and, for Saved profile, the public-page link). */
  children?: ReactNode;
}

export function SetupItem({ title, state, variant = "secondary", note, children }: SetupItemProps) {
  return (
    <li data-slot="setup-item">
      <Card size="sm">
        <CardHeader>
          <CardTitle role="heading" aria-level={3}>
            {title}
          </CardTitle>
          <CardAction>
            <Badge variant={variant}>{state}</Badge>
          </CardAction>
          {note ? <CardDescription>{note}</CardDescription> : null}
        </CardHeader>
        {children ? <CardContent className="flex flex-wrap items-end gap-in-group">{children}</CardContent> : null}
      </Card>
    </li>
  );
}
