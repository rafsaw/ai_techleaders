import { OctagonXIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@devmentor/ui/components/alert";
import { Button } from "@devmentor/ui/components/button";

export interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

// The shared error state: a destructive Alert (read at once, role="alert") with what happened,
// the server's message and, when the caller can retry, one Retry button. The default title says
// what happened, so it never repeats apiHandler's "Something went wrong" (P-E4, approved by
// Rafał 2026-10-21). Docs: error-state.mdx.
export function ErrorMessage({ title = "Couldn't load the data", message, onRetry }: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <OctagonXIcon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
