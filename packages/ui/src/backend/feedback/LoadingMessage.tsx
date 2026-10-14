import { Spinner } from "@devmentor/ui/components/spinner";

export function LoadingMessage({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
    >
      <Spinner aria-hidden />
      {label}
    </div>
  );
}
