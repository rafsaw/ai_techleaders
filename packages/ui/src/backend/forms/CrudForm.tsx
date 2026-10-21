"use client";

import { useId } from "react";
import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";
import { Button } from "@devmentor/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@devmentor/ui/components/field";
import { Input } from "@devmentor/ui/components/input";
import { useSchemaForm, type FieldName } from "@devmentor/ui/forms/useSchemaForm";

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

/**
 * Schema-driven create/edit form. Validates on the client with the shared
 * schema, shows server `fieldErrors` next to their fields, and standardizes
 * Cmd/Ctrl+Enter to submit and Escape to cancel. State lives in `useSchemaForm`,
 * shared with the public `SchemaForm`.
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
  const { values, setValue, fieldErrors, formError, isSubmitting, handleSubmit, handleKeyDown } = useSchemaForm({
    schema,
    fields,
    initialValues,
    onSubmit,
    onSuccess: () => onSuccess?.(),
    onCancel,
  });

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
                onChange={(event) => setValue(field.name, event.target.value)}
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
