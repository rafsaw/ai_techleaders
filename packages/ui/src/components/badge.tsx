import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@devmentor/ui/lib/utils"

// Pill shape is for badges only (Q3, Z5); 24 px high with the label role (B5). Status variants
// use a 10 % tint of their role in both themes (≥ 4.70:1, no dark: needed) and always carry
// text, never colour alone (Q2, WCAG 1.4.1). Docs: badge.mdx.
const badgeVariantClasses = cva(
  "group/badge inline-flex h-badge w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border border-transparent px-badge-x text-label whitespace-nowrap transition-colors duration-control focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:border-input",
        destructive:
          "bg-destructive/10 text-destructive [a]:hover:border-destructive/50",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        outline: "border-border text-foreground [a]:hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        link: "text-primary underline underline-offset-4 hover:decoration-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// cva only concatenates; cn resolves conflicts (border-transparent vs the outline border).
function badgeVariants(props?: Parameters<typeof badgeVariantClasses>[0]) {
  return cn(badgeVariantClasses(props))
}

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariantClasses>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
