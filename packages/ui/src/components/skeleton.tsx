import { cn } from "@devmentor/ui/lib/utils"

// A grey block in the shape of content that is still loading (first load of a list whose shape
// is known, e.g. /mentor/slots). Radius of a control, muted surface, slow pulse that stops with
// reduced motion (Q4). Hidden from assistive technology: the region that loads announces it
// once (role="status" or aria-busy), not every block. Docs: skeleton.mdx.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-control bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
