"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { z } from "zod";

import type { ApiResult, FieldErrors } from "@devmentor/ui/backend/api/types";
import { toFieldErrors } from "@devmentor/ui/forms/field-errors";

export type FieldName<TSchema extends z.ZodType> = Extract<keyof z.input<TSchema>, string>;

export type FormValues = Record<string, string>;

export interface UseSchemaFormOptions<TSchema extends z.ZodType, TData> {
  /** The same schema the API route validates with. */
  schema: TSchema;
  /** Field names in screen order; the first invalid one gets focus after a failed submit. */
  fields: readonly { name: FieldName<TSchema> }[];
  initialValues?: Partial<Record<FieldName<TSchema>, string>>;
  /** Usually an `apiCall`; failure envelopes are shown on the form. */
  onSubmit: (values: z.output<TSchema>) => Promise<ApiResult<TData>>;
  /** Receives the response data, e.g. to navigate to `data.redirectTo`. */
  onSuccess?: (data: TData) => void;
  /** Enables Escape to cancel. */
  onCancel?: () => void;
  /** Clear the fields after success (default). `false` keeps the saved values. */
  resetOnSuccess?: boolean;
}

// Every field starts as "" so the schema validates exactly what the inputs show
// (an undefined value would report "expected string" instead of the schema's message).
function toFormValues(fields: readonly { name: string }[], initialValues: Partial<FormValues>): FormValues {
  return Object.fromEntries(fields.map(({ name }) => [name, initialValues[name] ?? ""]));
}

function focusFirstInvalid(form: HTMLFormElement, fields: readonly { name: string }[], errors: FieldErrors) {
  const first = fields.find(({ name }) => errors[name]?.length);
  if (first) form.querySelector<HTMLElement>(`[name="${first.name}"]`)?.focus();
}

/**
 * Form state shared by `CrudForm` (signed-in) and `SchemaForm` (public): client validation with
 * the shared schema (on leaving a field, live while a shown error is being fixed, and on submit), server `fieldErrors` on their fields, a form-level error, no double submit,
 * focus on the first invalid field, Cmd/Ctrl+Enter to submit and Escape to cancel.
 */
export function useSchemaForm<TSchema extends z.ZodType, TData = unknown>({
  schema,
  fields,
  initialValues = {},
  onSubmit,
  onSuccess,
  onCancel,
  resetOnSuccess = true,
}: UseSchemaFormOptions<TSchema, TData>) {
  const [values, setValues] = useState(() => toFormValues(fields, initialValues));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Re-checks one field against the shared schema and updates only its errors. */
  function validateField(name: FieldName<TSchema>, nextValues: Record<string, string>) {
    const parsed = schema.safeParse(nextValues);
    const errors = parsed.success ? undefined : toFieldErrors(parsed.error.issues).fieldErrors[name];
    setFieldErrors((current) => {
      const next = { ...current };
      if (errors) next[name] = errors;
      else delete next[name];
      return next;
    });
  }

  /**
   * A field that already shows an error is re-checked as the user types, so the error goes away
   * as soon as the value is fixed. Clearing it here, not on blur, keeps the layout still while
   * the user clicks the submit button: a message removed on blur would move the button between
   * mousedown and mouseup and lose the click.
   */
  function setValue(name: FieldName<TSchema>, value: string) {
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    if (fieldErrors[name]) validateField(name, nextValues);
  }

  /**
   * Validates one field when the user leaves it, but only once it has a value or already shows
   * an error, so tabbing through an empty form does not paint it red.
   */
  function handleBlur(name: FieldName<TSchema>) {
    if (values[name] === "" && !fieldErrors[name]) return;
    validateField(name, values);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const form = event.currentTarget;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errors = toFieldErrors(parsed.error.issues);
      setFieldErrors(errors.fieldErrors);
      setFormError(errors.formError);
      focusFirstInvalid(form, fields, errors.fieldErrors);
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
      focusFirstInvalid(form, fields, serverFieldErrors);
      return;
    }

    if (resetOnSuccess) setValues(toFormValues(fields, initialValues));
    setFieldErrors({});
    setFormError(undefined);
    onSuccess?.(result.data);
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

  return { values, setValue, fieldErrors, formError, isSubmitting, handleBlur, handleSubmit, handleKeyDown };
}
