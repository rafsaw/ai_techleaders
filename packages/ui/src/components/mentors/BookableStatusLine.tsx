"use client";

import { useState } from "react";

import { Button } from "@devmentor/ui/components/button";

// The status line at the top of /mentor (E02 Flow 1): one of four sentences. When bookable it
// shows the public link with a copy button. It names only the missing items. Hierarchy by type,
// not colour (R01.5). Docs: bookable-status-line.mdx.

export type BookableStatus =
  | { status: "bookable"; publicUrl: string }
  | { status: "not-bookable"; missing: readonly ("profile" | "stripe")[] }
  | { status: "no-slots" }
  /** Phase 1, before the payouts item exists. */
  | { status: "phase-1" };

const MISSING = { profile: "your profile", stripe: "Stripe" } as const;

export function bookableSentence(state: BookableStatus): string {
  switch (state.status) {
    case "bookable":
      return "You are bookable.";
    case "no-slots":
      return "You are bookable, but you have no upcoming slots, so mentees have nothing to pick.";
    case "phase-1":
      return "Not bookable yet.";
    case "not-bookable":
      return `Not bookable yet: finish ${state.missing.map((item) => MISSING[item]).join(" and ")}.`;
  }
}

export interface BookableStatusLineProps {
  state: BookableStatus;
  /** navigator.clipboard.writeText by default; injectable for tests. */
  copy?: (text: string) => Promise<void>;
}

export function BookableStatusLine({ state, copy = (text) => navigator.clipboard.writeText(text) }: BookableStatusLineProps) {
  const [copied, setCopied] = useState<"yes" | "failed">();
  return (
    <div data-slot="bookable-status-line" className="flex w-full max-w-text flex-col gap-in-group">
      <p className="text-row-title">{bookableSentence(state)}</p>
      {state.status === "bookable" ? (
        <div className="flex flex-wrap items-center gap-in-group">
          <a href={state.publicUrl} className="min-w-0 font-mono text-meta wrap-anywhere text-foreground underline underline-offset-4 hover:decoration-2">
            {state.publicUrl}
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await copy(state.publicUrl);
                setCopied("yes");
              } catch {
                setCopied("failed");
              }
            }}
          >
            Copy link
          </Button>
          <span role="status" className="text-meta text-muted-foreground">
            {copied === "yes" ? "Copied." : copied === "failed" ? "Could not copy. Select the link and copy it." : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
