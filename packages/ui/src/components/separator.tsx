"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@devmentor/ui/lib/utils"

// A 1 px line in --border: decorative, below 3:1 by design (T7); rows are told apart by their
// text (R01.3, Z4). Docs: separator.mdx.
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
