import * as React from "react"
import { cn } from "@devmentor/ui/lib/utils"

// A panel: border and surface, no shadow (R01.3, Z4, P-S1), radius 12 px (Q3), padding 24 px
// or 16 px for size="sm" (B4). Title is the section-title role, the footer is separated by a
// line without a tinted background (B4). Docs: card.mdx.
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-between-groups overflow-hidden rounded-panel border border-border bg-card py-panel text-body text-card-foreground has-[>img:first-child]:pt-0 data-[size=sm]:py-panel-compact *:[img:first-child]:rounded-t-panel *:[img:last-child]:rounded-b-panel",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-panel group-data-[size=sm]/card:px-panel-compact has-data-[slot=card-action]:grid-cols-text-action [.border-b]:pb-panel group-data-[size=sm]/card:[.border-b]:pb-panel-compact",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-section-title group-data-[size=sm]/card:text-row-title",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-body text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-panel group-data-[size=sm]/card:px-panel-compact",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-in-group border-t border-border px-panel pt-panel group-data-[size=sm]/card:px-panel-compact group-data-[size=sm]/card:pt-panel-compact",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
