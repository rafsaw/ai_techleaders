import { Loader2Icon } from "lucide-react";
import type { ComponentProps } from "react";

import { linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import { cn } from "@devmentor/ui/lib/utils";

// The one main action of a public form (R01.6). While the request runs it is disabled, shows a
// spinner and an -ing label (P-C4), so a second click cannot submit twice. Docs: submit-button.mdx.
export interface SubmitButtonProps extends Omit<ComponentProps<"button">, "type"> {
  /** True while the request runs. */
  pending?: boolean;
  /** Label while pending, verb in -ing form: "Signing in…". */
  pendingLabel: string;
  variant?: "default" | "outline";
}

export function SubmitButton({ pending = false, pendingLabel, variant, disabled, className, children, ...props }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      data-slot="submit-button"
      disabled={pending || disabled}
      className={cn(linkButtonVariants({ variant }), className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2Icon aria-hidden className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
