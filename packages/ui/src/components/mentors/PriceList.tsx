import type { ComponentProps } from "react";

import { cn } from "@devmentor/ui/lib/utils";

// /mentors/[id] (E02 Flow 2 step 4): "25 min · $40" and "50 min · $70", always both formats in
// this order (R01, D06). The page formats the money with core's formatMoney (P17), because ui
// may not import core. Public kit only (F3). Docs: price-list.mdx.

export interface PriceListProps extends ComponentProps<"ul"> {
  /** Formatted with `formatMoney`, e.g. `{ 25: "$40", 50: "$70" }`. */
  prices: { 25: string; 50: string };
}

const FORMATS = [25, 50] as const;

export function PriceList({ prices, className, ...props }: PriceListProps) {
  return (
    <ul data-slot="price-list" aria-label="Prices" className={cn("flex flex-col gap-list-row-gap text-body", className)} {...props}>
      {FORMATS.map((minutes) => (
        <li key={minutes} className="tabular-nums">
          {minutes} min · <span className="font-semibold">{prices[minutes]}</span>
        </li>
      ))}
    </ul>
  );
}
