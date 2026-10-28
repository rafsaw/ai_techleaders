"use client";

import type { ChangeEvent, ReactNode } from "react";
import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { useSchemaForm, type FieldName } from "@devmentor/ui/forms/useSchemaForm";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { PasswordField } from "@devmentor/ui/frontend/forms/PasswordField";
import { SubmitButton } from "@devmentor/ui/frontend/forms/SubmitButton";
import { TextField } from "@devmentor/ui/frontend/forms/TextField";

export interface SchemaField<TName extends string = string> {
  name: TName;
  /** Always visible; never replaced by the placeholder. */
  label: string;
  type?: "text" | "email" | "password";
  hint?: ReactNode;
  autoComplete?: string;
  placeholder?: string;
}

export interface SchemaFormProps<TSchema extends z.ZodType, TData> {
  /** The same schema the API route validates with. */
  schema: TSchema;
  fields: readonly SchemaField<FieldName<TSchema>>[];
  initialValues?: Partial<Record<FieldName<TSchema>, string>>;
  /** Verb and object (P-C3): "Sign in", "Create account". */
  submitLabel: string;
  /** -ing form (P-C4): "Signing in…". */
  pendingLabel: string;
  /** Usually an `apiCall`; failure envelopes are shown on the form. */
  onSubmit: (values: z.output<TSchema>) => Promise<ApiResult<TData>>;
  /** Receives the response data, e.g. to navigate to `data.redirectTo`. */
  onSuccess?: (data: TData) => void;
  /** Default `false`: a public form navigates on success, so the values stay while it does. */
  resetOnSuccess?: boolean;
  /** Shown above the fields, before the user types (e.g. the N03 notice). */
  children?: ReactNode;
}

/**
 * Public, schema-driven form (F3): one column, labels always visible, validation when a field is
 * left and on submit, focus on the first error, values kept after a failure, one submit at a
 * time, success only after the server answers. Docs: schema-form.mdx.
 */
export function SchemaForm<TSchema extends z.ZodType, TData = unknown>({
  schema,
  fields,
  initialValues,
  submitLabel,
  pendingLabel,
  onSubmit,
  onSuccess,
  resetOnSuccess = false,
  children,
}: SchemaFormProps<TSchema, TData>) {
  const { values, setValue, fieldErrors, formError, isSubmitting, handleBlur, handleSubmit, handleKeyDown } =
    useSchemaForm({ schema, fields, initialValues, onSubmit, onSuccess, resetOnSuccess });

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="flex w-full max-w-text flex-col gap-between-groups"
    >
      {children}
      {formError ? <Notice variant="error" title={formError} /> : null}
      {fields.map((field) => {
        const common = {
          name: field.name,
          label: field.label,
          hint: field.hint,
          errors: fieldErrors[field.name],
          placeholder: field.placeholder,
          value: values[field.name],
          onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(field.name, event.target.value),
          onBlur: () => handleBlur(field.name),
        };
        return field.type === "password" ? (
          <PasswordField
            key={field.name}
            {...common}
            autoComplete={field.autoComplete === "new-password" ? "new-password" : "current-password"}
          />
        ) : (
          <TextField key={field.name} {...common} type={field.type} autoComplete={field.autoComplete} />
        );
      })}
      <SubmitButton pending={isSubmitting} pendingLabel={pendingLabel} className="w-full">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
