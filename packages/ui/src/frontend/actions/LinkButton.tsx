import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@devmentor/ui/lib/utils";

// Public kit: the signed-in Button's look (Q3, B1, B2, B3) in plain Tailwind, with the same
// variant names, limited to what the public pages use. A link stays a real <a> (WCAG 4.1.2;
// E01: "the GitHub button is a real link"). Docs: link-button.mdx.
const linkButtonVariantClasses = cva(
  "inline-flex shrink-0 items-center justify-center gap-in-group rounded-button border border-transparent text-label whitespace-nowrap transition-colors duration-control outline-none select-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "h-button-md bg-primary px-button-x-md text-primary-foreground not-disabled:hover:bg-primary/90",
        outline: "h-button-md border-input px-button-x-md text-foreground not-disabled:hover:bg-accent",
        link: "text-primary underline underline-offset-4 hover:decoration-2",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

// cva only concatenates; cn resolves conflicts (border-transparent vs border-input).
export function linkButtonVariants(props?: Parameters<typeof linkButtonVariantClasses>[0]) {
  return cn(linkButtonVariantClasses(props));
}

export type LinkButtonProps = ComponentProps<"a"> & VariantProps<typeof linkButtonVariantClasses> & { href: string };

/** A navigation that looks like a button (or a text link). For Next's <Link>, use `linkButtonVariants`. */
export function LinkButton({ variant, className, ...props }: LinkButtonProps) {
  return <a data-slot="link-button" className={cn(linkButtonVariants({ variant }), className)} {...props} />;
}
