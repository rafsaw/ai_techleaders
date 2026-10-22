// Documentation blocks for Foundations pages. They render the real CSS variables of the
// package (prompt rule 5: helper blocks live in .storybook and are not exported).
import { useSyncExternalStore, type ReactNode } from "react";

import { measure, resolveToken, type Theme } from "./contrast";

const noSubscription = () => () => {};

/** False during server-side or first render, true in the browser where stylesheets are loaded. */
function useMounted() {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div>
      {/* P-AUD1, proposal approved by Rafał; WCAG 2.1.1. See preview.css: tables scroll. */}
      <table
        tabIndex={0}
        aria-label={head.join(", ")}
        className="w-full border-collapse text-left text-body text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      >
        <thead>
          <tr className="border-b border-border">
            {head.map((cell) => (
              <th key={cell} scope="col" className="py-2 pr-4 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

const Cell = ({ children, mono }: { children: ReactNode; mono?: boolean }) => (
  <td className={mono ? "py-2 pr-4 align-top font-mono text-meta" : "py-2 pr-4 align-top"}>{children}</td>
);

export type ColorRole = { token: string; purpose: string; avoid: string; source: string };

/** A swatch painted with the token itself, plus the resolved value in each theme. */
export function ColorRoleTable({ roles }: { roles: ColorRole[] }) {
  const mounted = useMounted();
  return (
    <Table head={["Swatch", "Token", "Light", "Dark", "Use for", "Never for", "Source"]}>
      {roles.map((role) => (
        <tr key={role.token}>
          <Cell>
            <span
              aria-hidden
              className="block size-8 rounded-control border border-input"
              style={{ background: `var(${role.token})` }}
            />
          </Cell>
          <Cell mono>{role.token}</Cell>
          <Cell mono>{mounted ? resolveToken(role.token, "light") : "…"}</Cell>
          <Cell mono>{mounted ? resolveToken(role.token, "dark") : "…"}</Cell>
          <Cell>{role.purpose}</Cell>
          <Cell>{role.avoid}</Cell>
          <Cell>{role.source}</Cell>
        </tr>
      ))}
    </Table>
  );
}

export type ContrastPair = { fg: string; bg: string; kind: "text" | "ui"; tint?: Partial<Record<Theme, number>>; note?: string };

const THRESHOLD = { text: 4.5, ui: 3 } as const;

/** Measured contrast of every pair in both themes; pairs under the WCAG threshold are marked in text. */
export function ContrastTable({ pairs }: { pairs: ContrastPair[] }) {
  const mounted = useMounted();
  const result = (pair: ContrastPair, theme: Theme) => {
    const ratio = measure(pair.fg, pair.bg, theme, pair.tint?.[theme]);
    if (ratio === null) return "not measurable";
    const pass = ratio >= THRESHOLD[pair.kind];
    return `${ratio.toFixed(2)} : 1 ${pass ? "✓ passes" : "✗ below threshold"}`;
  };
  const label = (pair: ContrastPair) =>
    pair.tint ? `${pair.fg} on its tint (light ${(pair.tint.light ?? 0) * 100}%, dark ${(pair.tint.dark ?? 0) * 100}%) over ${pair.bg}` : `${pair.fg} on ${pair.bg}`;
  return (
    <Table head={["Pair", "Kind", "Threshold", "Light", "Dark", "Note"]}>
      {pairs.map((pair) => (
        <tr key={label(pair)}>
          <Cell mono>{label(pair)}</Cell>
          <Cell>{pair.kind === "text" ? "text" : "UI element"}</Cell>
          <Cell>{THRESHOLD[pair.kind]} : 1</Cell>
          <Cell>{mounted ? result(pair, "light") : "…"}</Cell>
          <Cell>{mounted ? result(pair, "dark") : "…"}</Cell>
          <Cell>{pair.note ?? ""}</Cell>
        </tr>
      ))}
    </Table>
  );
}

export type TokenRow = { token: string; utility: string; use: string; source: string; sample?: ReactNode };

/** Generic token table: live value, the Tailwind utility to use, purpose and source. */
export function TokenTable({ rows }: { rows: TokenRow[] }) {
  const mounted = useMounted();
  const value = (token: string) =>
    mounted ? getComputedStyle(document.documentElement).getPropertyValue(token).trim() || resolveToken(token, "light") : "…";
  const withSample = rows.some((row) => row.sample);
  return (
    <Table head={[...(withSample ? ["Sample"] : []), "Token", "Value", "Utility", "Use for", "Source"]}>
      {rows.map((row) => (
        <tr key={row.token}>
          {withSample ? <Cell>{row.sample}</Cell> : null}
          <Cell mono>{row.token}</Cell>
          <Cell mono>{value(row.token)}</Cell>
          <Cell mono>{row.utility}</Cell>
          <Cell>{row.use}</Cell>
          <Cell>{row.source}</Cell>
        </tr>
      ))}
    </Table>
  );
}

/** A bar whose width is the spacing token itself. */
export const SpacingBar = ({ token }: { token: string }) => (
  <span aria-hidden className="block h-4 bg-primary" style={{ width: `var(${token})` }} />
);

/** A box whose corner radius is the radius token itself. */
export const RadiusBox = ({ token }: { token: string }) => (
  <span aria-hidden className="block size-12 border border-input bg-card" style={{ borderRadius: `var(${token})` }} />
);

/** A box that moves on hover using the duration token, so its timing can be felt. */
export const DurationDemo = ({ token, label }: { token: string; label: string }) => (
  <button
    type="button"
    className="h-button-sm rounded-button border border-input bg-card px-3 text-body text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    style={{ transitionDuration: `var(${token})` }}
  >
    {label}
  </button>
);
