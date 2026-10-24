import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@devmentor/ui/lib/utils";

// Public kit (Q1 = a): plain Tailwind on the same tokens as the signed-in Input and Field, so
// both areas look alike without shadcn or Base UI. Height, padding, text: B1; focus and error:
// B3; disabled: B2. Docs: text-field.mdx.
export const controlClasses =
  "h-control-md w-full min-w-0 rounded-control border border-input bg-transparent px-control-x text-control text-foreground transition-colors duration-control outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive";

export interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  errors?: readonly string[];
  /** The control; receives its ids through `describedBy` and `invalid`. */
  children: (control: { describedBy: string | undefined; invalid: true | undefined }) => ReactNode;
}

/** Label, control, hint and error in that order (same as the signed-in Field). */
export function FieldShell({ id, label, hint, errors = [], children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors.length > 0 ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div data-slot="text-field" className="flex w-full flex-col gap-in-group">
      <label htmlFor={id} className="w-fit text-label text-foreground">
        {label}
      </label>
      {children({ describedBy, invalid: errorId ? true : undefined })}
      {hint ? (
        <p id={hintId} className="text-meta text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {errorId ? (
        <div id={errorId} role="alert" className="text-meta text-destructive">
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul className="ml-4 flex list-disc flex-col gap-list-row-gap">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<ComponentProps<"input">, "type" | "children"> {
  /** Always visible; the placeholder is only an example (prompt, Form pattern). */
  label: string;
  type?: "text" | "email";
  /** A rule or example, shown before the user types. */
  hint?: ReactNode;
  /** Messages for this field from the schema or the server. */
  errors?: readonly string[];
}

export function TextField({ label, type = "text", hint, errors, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} errors={errors}>
      {({ describedBy, invalid }) => (
        <input
          id={inputId}
          type={type}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(controlClasses, className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}
