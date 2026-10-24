import type { ReactNode } from "react";

// Documentation-only layout blocks for stories and MDX pages. Never exported from the package.

/** A state matrix: one row per state, each with a label, an optional note and real components. */
export function StateTable({
  rows,
}: {
  rows: { state: string; note?: string; children: ReactNode }[];
}) {
  return (
    <table className="w-full table-fixed border-collapse text-left text-body text-foreground">
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className="w-1/4 py-in-group pr-between-groups text-label">State</th>
          <th scope="col" className="py-in-group text-label">Preview</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row) => (
          <tr key={row.state}>
            <th scope="row" className="py-between-groups pr-between-groups align-top text-label">
              {row.state}
              {row.note ? <span className="block text-meta text-muted-foreground">{row.note}</span> : null}
            </th>
            <td className="py-between-groups">
              <div className="flex flex-wrap items-start gap-between-groups *:min-w-0">{row.children}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A "do / don't" pair shown side by side, each with one sentence of explanation. */
export function DoDont({
  doExample,
  doText,
  dontExample,
  dontText,
}: {
  doExample: ReactNode;
  doText: string;
  dontExample: ReactNode;
  dontText: string;
}) {
  return (
    <div className="grid gap-between-groups md:grid-cols-2">
      <figure className="flex flex-col gap-in-group rounded-panel border border-border bg-card p-panel-compact">
        <div className="flex flex-wrap items-start gap-in-group">{doExample}</div>
        <figcaption className="text-meta text-foreground">
          <strong className="text-success">✓ Do.</strong> {doText}
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-in-group rounded-panel border border-border bg-card p-panel-compact">
        <div className="flex flex-wrap items-start gap-in-group">{dontExample}</div>
        <figcaption className="text-meta text-foreground">
          <strong className="text-destructive">✗ Don&apos;t.</strong> {dontText}
        </figcaption>
      </figure>
    </div>
  );
}

/** A labelled cell used to lay out variants and sizes in a story. */
export function Sample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-in-group">
      <span className="text-meta text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
