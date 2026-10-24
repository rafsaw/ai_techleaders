import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@devmentor/ui/components/empty";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** E.g. a button that creates the first record. */
  action?: ReactNode;
}

// The shared empty state: why the list is empty and, when there is one, the next step.
// Docs: empty.mdx.
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
