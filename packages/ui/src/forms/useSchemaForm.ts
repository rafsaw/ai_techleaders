"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { z } from "zod";

import type { ApiResult, FieldErrors } from "@devmentor/ui/api/types";
import { failureMessage, toFieldErrors } from "@devmentor/ui/forms/field-errors";

export type FieldName<TSchema extends z.ZodType> = Extract<keyof z.input<TSchema>, string>;

export type FormValues = Record<string, string>;

/**
 * How long a form locked after success (`lockAfterSuccess`) waits for its page to go away. A
 * navigation that fails or never completes unlocks it then, so nobody is stuck on a pending form.
 */
export const SUCCESS_LOCK_TIMEOUT_MS = 10_000;

export interface UseSchemaFormOptions<TSchema extends z.ZodType, TData> {
  /** The same schema the API route validates with. */
  schema: TSchema;
  /** Field names in screen order; the first invalid one gets focus after a failed submit. */
  fields: readonly { name: FieldName<TSchema> }[];
  initialValues?: Partial<Record<FieldName<TSchema>, string>>;
  /**
   * Usually an `apiCall`; failure envelopes are shown on the form. Pass `signal` on to the
   * request: it aborts when the form unmounts. Must not reject (`apiCall` never does).
   */
  onSubmit: (values: z.output<TSchema>, options: { signal: AbortSignal }) => Promise<ApiResult<TData>>;
  /** Receives the response data, e.g. to navigate to `data.redirectTo`. */
  onSuccess?: (data: TData) => void;
  /** Enables Escape to cancel. */
  onCancel?: () => void;
  /** Clear the fields after success (default). `false` keeps the saved values. */
  resetOnSuccess?: boolean;
  /**
   * For a form whose `onSuccess` navigates away (default `false`): stay pending after success
   * until the page unmounts, so a late second click cannot submit again. It unlocks when the page
   * comes back from the back/forward cache, or after `SUCCESS_LOCK_TIMEOUT_MS`.
   */
  lockAfterSuccess?: boolean;
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
 * Form state shared by `CrudForm` (signed-in) and `SchemaForm` (public, platform F2): client
 * validation with the shared schema (on leaving a field, live while a shown error is being fixed,
 * and on submit), server `fieldErrors` on their fields, a form-level error (a 429 always reads
 * `RATE_LIMITED_MESSAGE`), focus on the first invalid field, Cmd/Ctrl+Enter to submit and Escape
 * to cancel. One request at a time: a second submit while one runs is ignored, even within the
 * same event-loop turn, and with `lockAfterSuccess` none after success either. Unmounting aborts
 * the running request and drops its result.
 */
export function useSchemaForm<TSchema extends z.ZodType, TData = unknown>({
  schema,
  fields,
  initialValues = {},
  onSubmit,
  onSuccess,
  onCancel,
  resetOnSuccess = true,
  lockAfterSuccess = false,
}: UseSchemaFormOptions<TSchema, TData>) {
  const [values, setValues] = useState(() => toFormValues(fields, initialValues));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The state above re-renders too late to stop two submits in one turn (a double click, Enter
  // plus click); the ref is set synchronously. The controller belongs to the running request.
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  // Set while a successful submit waits for its navigation (`lockAfterSuccess`).
  const locked = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const unlock = useCallback(() => {
    if (!locked.current) return;
    locked.current = false;
    clearTimeout(lockTimer.current);
    inFlight.current = false;
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    // Back from the next page can restore this one, still locked, from the back/forward cache.
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) unlock();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      clearTimeout(lockTimer.current);
      request.current?.abort();
      request.current = null;
    };
  }, [unlock]);

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
    if (inFlight.current) return;
    const form = event.currentTarget;

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errors = toFieldErrors(parsed.error.issues);
      setFieldErrors(errors.fieldErrors);
      setFormError(errors.formError);
      focusFirstInvalid(form, fields, errors.fieldErrors);
      return;
    }

    inFlight.current = true;
    const controller = new AbortController();
    request.current = controller;
    setIsSubmitting(true);
    const result = await onSubmit(parsed.data, { signal: controller.signal });
    // Unmounted meanwhile: nothing left to update or hand on.
    if (controller.signal.aborted) return;
    request.current = null;
    if (result.ok && lockAfterSuccess) {
      locked.current = true;
      lockTimer.current = setTimeout(unlock, SUCCESS_LOCK_TIMEOUT_MS);
    } else {
      inFlight.current = false;
      setIsSubmitting(false);
    }

    if (!result.ok) {
      const serverFieldErrors = result.error.fieldErrors ?? {};
      setFieldErrors(serverFieldErrors);
      // A field-level failure is already shown next to its fields.
      setFormError(Object.keys(serverFieldErrors).length > 0 ? undefined : failureMessage(result.error));
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
