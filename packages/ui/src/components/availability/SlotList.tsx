import type { ReactNode } from "react";

import { EmptyState } from "@devmentor/ui/backend/feedback/EmptyState";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";
import { Skeleton } from "@devmentor/ui/components/skeleton";

// "Upcoming slots" on /mentor/slots (E02 Flow 4): a dense list of SlotRows separated by lines
// (R01.1, R01.3), oldest first. Loading shows rows of the same shape (P-LD1); empty says why and
// points to the form above (E02 UI/UX); a load error offers Retry. Docs: slot-list.mdx.

export interface SlotListProps {
  /** SlotRow elements, oldest first. */
  children?: ReactNode;
  /** Number of rows; 0 shows the empty state. */
  count: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function SlotList({ children, count, loading = false, error, onRetry }: SlotListProps) {
  return (
    <section aria-labelledby="upcoming-slots" data-slot="slot-list" className="flex w-full max-w-text flex-col gap-in-group">
      <h2 id="upcoming-slots" className="text-section-title">
        Upcoming slots
      </h2>
      {error ? (
        <ErrorMessage title="Couldn't load your slots" message={error} onRetry={onRetry} />
      ) : loading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading upcoming slots</span>
          <ul className="divide-y divide-border">
            {[0, 1, 2].map((row) => (
              <li key={row} className="grid grid-cols-text-action items-center gap-x-in-group py-list-row-y">
                <div className="flex flex-col gap-list-row-gap">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-full max-w-72" />
                </div>
                <Skeleton className="h-badge w-14 rounded-pill" />
              </li>
            ))}
          </ul>
        </div>
      ) : count === 0 ? (
        <EmptyState title="No upcoming slots" description="Mentees can only book times you publish." />
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </section>
  );
}
