"use client"

import * as React from "react"
import { cn } from "@devmentor/ui/lib/utils"

// Label role (14/500); a disabled field's label uses the disabled text colour, not opacity (B2).
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-in-group text-label select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-disabled-foreground peer-disabled:cursor-not-allowed peer-disabled:text-disabled-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Label }
