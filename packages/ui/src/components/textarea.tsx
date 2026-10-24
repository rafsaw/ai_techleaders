import * as React from "react"
import { cn } from "@devmentor/ui/lib/utils"

// Same shape and states as Input (B1, B2, B3); grows with its content. wrap-anywhere keeps a
// long URL from widening the layout at 320 px. Docs: textarea.mdx.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full wrap-anywhere rounded-control border border-input bg-transparent px-control-x py-2 text-control text-foreground transition-colors duration-control outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
