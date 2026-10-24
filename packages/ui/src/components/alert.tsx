import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@devmentor/ui/lib/utils"

// A compact panel (B4: 16 px padding, radius 12 px) with a border, never a shadow. The variant
// colours the icon and title; the description stays in the body colour, so status is never
// colour alone (Q2, WCAG 1.4.1). role="alert" by default; pass role="status" for news that
// does not need action. Docs: alert.mdx.
const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-panel border border-border bg-card p-panel-compact text-left text-body has-data-[slot=alert-action]:pr-24 has-[>svg]:grid-cols-icon-text has-[>svg]:gap-x-in-group *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "text-card-foreground",
        destructive: "text-destructive",
        success: "text-success",
        warning: "text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant ?? "default"}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-label group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:decoration-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-body text-card-foreground group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:decoration-2 [&_p:not(:last-child)]:mb-in-group",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-3 right-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
