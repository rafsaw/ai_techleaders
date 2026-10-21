import { Spinner } from "@devmentor/ui/components/spinner";

// The shared loading state for /backend lists and panels whose shape is not known yet: a
// spinner and a visible label, announced once (role="status"). Left-aligned like the content
// it replaces. Docs: loading-message.mdx.
export function LoadingMessage({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-in-group py-component text-body text-muted-foreground"
    >
      <Spinner aria-hidden />
      {label}
    </div>
  );
}
