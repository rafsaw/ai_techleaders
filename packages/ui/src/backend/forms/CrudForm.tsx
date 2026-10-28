"use client";

import { useId } from "react";
import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";
import { Button } from "@devmentor/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@devmentor/ui/components/field";
import { Input } from "@devmentor/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@devmentor/ui/components/native-select";
import { Textarea } from "@devmentor/ui/components/textarea";
import { useSchemaForm, type FieldName } from "@devmentor/ui/forms/useSchemaForm";

export interface CrudField<TName extends string = string> {
  name: TName;
  label: string;
  /**
   * HTML input type, or `textarea` / `select` (E02 Flow 2, Phase 1; proposal approved by Rafał).
   * Number fields need `z.coerce.number()` in the schema.
   */
  type?: "text" | "email" | "password" | "number" | "url" | "tel" | "textarea" | "select";
  /** For `select`: the text of the empty first option, e.g. "Choose an area". */
  placeholder?: string;
  /** For `select`: the choices. */
  options?: readonly { value: string; label: string }[];
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
  /** Clear the fields after a successful save (default). `false` keeps the saved values, e.g. `/account`. */
  resetOnSuccess?: boolean;
}

/**
 * Schema-driven create/edit form. Validates on the client with the shared
 * schema (on leaving a field once it has a value or an error, and on submit),
 * shows server `fieldErrors` next to their fields, tied with `aria-describedby`,
 * and standardizes
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
  resetOnSuccess = true,
}: CrudFormProps<TSchema>) {
  const idPrefix = useId();
  const { values, setValue, fieldErrors, formError, isSubmitting, handleBlur, handleSubmit, handleKeyDown } = useSchemaForm({
    schema,
    fields,
    initialValues,
    onSubmit,
    onSuccess: () => onSuccess?.(),
    onCancel,
    resetOnSuccess,
  });

  return (
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-between-groups">
      {formError && <ErrorMessage title="Could not save" message={formError} />}
      <FieldGroup>
        {fields.map((field) => {
          const id = `${idPrefix}-${field.name}`;
          const errors = fieldErrors[field.name];
          // The error is tied to its field (WCAG 1.3.1, 3.3.1); a field is checked when the person
          // leaves it (Form pattern, prompt stage 3; rule 12, approved by Rafał 2026-10-21).
          const errorId = `${id}-error`;
          const control = {
            id,
            name: field.name,
            value: values[field.name],
            "aria-invalid": errors ? true : undefined,
            "aria-describedby": errors ? errorId : undefined,
            onBlur: () => handleBlur(field.name),
          };
          return (
            <Field key={field.name} data-invalid={errors ? true : undefined}>
              <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
              {field.type === "textarea" ? (
                <Textarea
                  {...control}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              ) : field.type === "select" ? (
                <NativeSelect
                  {...control}
                  className="w-full"
                  autoComplete={field.autoComplete}
                  onChange={(event) => setValue(field.name, event.target.value)}
                >
                  <NativeSelectOption value="">{field.placeholder ?? ""}</NativeSelectOption>
                  {field.options?.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  {...control}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              )}
              <FieldError id={errorId} errors={errors?.map((message) => ({ message }))} />
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
