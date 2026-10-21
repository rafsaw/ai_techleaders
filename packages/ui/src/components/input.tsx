import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@devmentor/ui/lib/utils"

// Height, padding and text: B1. Focus: B3. Error: B3 (border only, message in FieldError).
// Disabled: B2 colours, no opacity. Docs: input.mdx.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-control-md w-full min-w-0 rounded-control border border-input bg-transparent px-control-x py-1 text-control text-foreground transition-colors duration-control outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-label file:text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
