import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@devmentor/ui/lib/utils"

// Shape, density and states: Q3 (heights, radius), B1 (padding), B2 (hover, press,
// disabled colours), B3 (focus), C7 (destructive hover). Docs: button.mdx.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-in-group rounded-button border border-transparent bg-clip-padding text-label whitespace-nowrap transition-colors duration-control outline-none select-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:border-transparent data-disabled:bg-disabled data-disabled:text-disabled-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground not-data-disabled:hover:bg-primary/90 not-data-disabled:active:bg-primary/90",
        outline:
          "border-input bg-transparent text-foreground not-data-disabled:hover:bg-accent not-data-disabled:hover:text-accent-foreground not-data-disabled:active:bg-accent aria-expanded:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground not-data-disabled:hover:border-input not-data-disabled:active:border-input aria-expanded:border-input",
        ghost:
          "text-foreground not-data-disabled:hover:bg-accent not-data-disabled:hover:text-accent-foreground not-data-disabled:active:bg-accent aria-expanded:bg-accent data-disabled:bg-transparent",
        destructive:
          "bg-destructive/10 text-destructive not-data-disabled:hover:border-destructive/50 not-data-disabled:active:border-destructive/50",
        link: "text-primary underline underline-offset-4 not-data-disabled:hover:decoration-2 data-disabled:bg-transparent",
      },
      size: {
        default: "h-button-md px-button-x-md",
        xs: "h-button-xs px-button-x-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-button-sm px-button-x-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-button-lg px-button-x-lg",
        icon: "size-button-md",
        "icon-xs": "size-button-xs [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-button-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-button-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
