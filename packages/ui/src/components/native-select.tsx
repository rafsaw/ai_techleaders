import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@devmentor/ui/lib/utils"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
}

// Same shape and states as Input (B1, B2, B3). The browser draws the option list,
// so keyboard and screen reader behaviour are native. Docs: native-select.mdx.
function NativeSelect({
  className,
  size = "default",
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn("group/native-select relative w-fit", className)}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className="h-control-md w-full min-w-0 appearance-none rounded-control border border-input bg-transparent py-1 pr-9 pl-control-x text-control text-foreground transition-colors duration-control outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive data-[size=sm]:h-control-sm"
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-control-x size-4 -translate-y-1/2 text-muted-foreground select-none group-has-[select:disabled]/native-select:text-disabled-foreground"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-popover text-popover-foreground", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-popover text-popover-foreground", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
