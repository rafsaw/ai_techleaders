"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { controlClasses, FieldShell } from "@devmentor/ui/frontend/forms/TextField";
import { cn } from "@devmentor/ui/lib/utils";

// A text field for passwords (E01 AD6: at least 15 characters, no composition rules, paste and
// password managers allowed). The rule is a visible hint before typing; a toggle button shows
// the typed phrase (P-PF1, proposal approved by PO(Rafał)). Docs: password-field.mdx.
export const PASSWORD_HINT = "Use a short phrase of at least 15 characters.";

export interface PasswordFieldProps extends Omit<ComponentProps<"input">, "type" | "children"> {
  label?: string;
  /** Defaults to the AD6 length rule. */
  hint?: ReactNode;
  errors?: readonly string[];
  /** `current-password` to sign in, `new-password` to choose one (sign-up). */
  autoComplete?: "current-password" | "new-password";
}

export function PasswordField({
  label = "Password",
  hint = PASSWORD_HINT,
  errors,
  autoComplete = "current-password",
  id,
  className,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={inputId} label={label} hint={hint} errors={errors}>
      {({ describedBy, invalid }) => (
        <div className="relative">
          <input
            id={inputId}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cn(controlClasses, "pr-button-md", className)}
            {...props}
          />
          <button
            type="button"
            aria-controls={inputId}
            aria-pressed={visible}
            aria-label="Show password"
            disabled={props.disabled}
            onClick={() => setVisible((current) => !current)}
            className="absolute inset-y-0 right-0 flex w-button-md items-center justify-center rounded-control text-muted-foreground transition-colors duration-control outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:text-disabled-foreground"
          >
            {visible ? <EyeOffIcon aria-hidden className="size-4" /> : <EyeIcon aria-hidden className="size-4" />}
          </button>
        </div>
      )}
    </FieldShell>
  );
}
