import { Loader2Icon } from "lucide-react"
import { cn } from "@devmentor/ui/lib/utils"

// A 16 px spinning icon in the current text colour (icons 16/14/12, lucide only). Alone it
// announces "Loading"; next to a text label (a button's "Publishing slot…", LoadingMessage)
// pass aria-hidden so the label is read once. Stops with reduced motion (Q4). Docs: spinner.mdx.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 shrink-0 animate-spin", className)} {...props} />
  )
}

export { Spinner }
