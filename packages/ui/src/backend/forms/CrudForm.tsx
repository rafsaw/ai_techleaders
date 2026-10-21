"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import type { z } from "zod";

import type { ApiResult, FieldErrors } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";
import { Button } from "@devmentor/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@devmentor/ui/components/field";
import { Input } from "@devmentor/ui/components/input";

type FieldName<TSchema extends z.ZodType> = Extract<keyof z.input<TSchema>, string>;

export interface CrudField<TName extends string = string> {
  name: TName;
  label: string;
  /** HTML input type. Number fields need `z.coerce.number()` in the schema. */
  type?: "text" | "email" | "password" | "number" | "url" | "tel";
  placeholder?: string;
  autoComplete?: string;
}

export interface CrudFormProps<TSchema extends z.ZodType> {
  /** The same schema the API route validates with. */
  schema: TSchema;
  fields: readonly CrudField<FieldName<TSchema>>[];
  initialValues?: Partial<Record<FieldName<TSchema>, string>>;
  submitLabel?: string;
  /** Usually an `apiCall`; failure envelopes are shown on the form. */
  onSubmit: (values: z.output<TSchema>) => Promise<ApiResult<unknown>>;
  onSuccess?: () => void;
  /** Shows a Cancel button and enables Escape to cancel. */
  onCancel?: () => void;
}

type Issue = { path: readonly PropertyKey[]; message: string };

type FormValues = Record<string, string>;

// Every field starts as "" so the schema validates exactly what the inputs show.
function toFormValues(fields: readonly CrudField[], initialValues: Partial<FormValues>): FormValues {
  return Object.fromEntries(fields.map(({ name }) => [name, initialValues[name] ?? ""]));
}

// Mirrors `parseInput` in `@devmentor/core`, so client- and server-side
// errors land on the same fields.
function toFieldErrors(issues: readonly Issue[]): { fieldErrors: FieldErrors; formError?: string } {
  const fieldErrors: FieldErrors = {};
  let formError: string | undefined;
  for (const issue of issues) {
    const [field] = issue.path;
    if (field === undefined) formError ??= issue.message;
    else (fieldErrors[String(field)] ??= []).push(issue.message);
  }
  return { fieldErrors, formError };
}

/**
 * Schema-driven create/edit form. Validates on the client with the shared
 * schema, shows server `fieldErrors` next to their fields, and standardizes
 * Cmd/Ctrl+Enter to submit and Escape to cancel.
 */
export function CrudForm<TSchema extends z.ZodType>({
  schema,
  fields,
  initialValues = {},
  submitLabel = "Save",
  onSubmit,
  onSuccess,
  onCancel,
}: CrudFormProps<TSchema>) {
  const idPrefix = useId();
  const [values, setValues] = useState(() => toFormValues(fields, initialValues));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errors = toFieldErrors(parsed.error.issues);
      setFieldErrors(errors.fieldErrors);
      setFormError(errors.formError);
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(parsed.data);
    setIsSubmitting(false);

    if (!result.ok) {
      const serverFieldErrors = result.error.fieldErrors ?? {};
      setFieldErrors(serverFieldErrors);
      // A field-level failure is already shown next to its fields.
      setFormError(Object.keys(serverFieldErrors).length > 0 ? undefined : result.error.message);
      return;
    }

    setValues(toFormValues(fields, initialValues));
    setFieldErrors({});
    setFormError(undefined);
    onSuccess?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-between-groups">
      {formError && <ErrorMessage title="Could not save" message={formError} />}
      <FieldGroup>
        {fields.map((field) => {
          const id = `${idPrefix}-${field.name}`;
          const errors = fieldErrors[field.name];
          return (
            <Field key={field.name} data-invalid={errors ? true : undefined}>
              <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
              <Input
                id={id}
                name={field.name}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                value={values[field.name]}
                aria-invalid={errors ? true : undefined}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
              />
              <FieldError errors={errors?.map((message) => ({ message }))} />
            </Field>
          );
        })}
      </FieldGroup>
      <div className="flex justify-end gap-in-group">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
