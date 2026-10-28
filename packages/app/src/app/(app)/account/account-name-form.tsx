"use client";

import { accountUpdateSchema } from "@devmentor/core/validators/auth/account-update.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { CrudForm } from "@devmentor/ui/backend/forms/CrudForm";
import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { unlessSessionExpired } from "@/app/session-expiry";
import type { AccountDto } from "@/server/services/auth/user.service";

/**
 * The editable display name on /account. The saved value stays in the field
 * (`resetOnSuccess={false}`) and "Name saved" confirms it (SM-AC11). A refresh
 * re-renders the server parts, so the header shows the new name too. When the
 * API answers 401 the database session has expired: the page fully navigates
 * to sign-in, discarding the unsaved name, and the form stays pending until
 * the browser leaves (SM-AC2).
 */
export function AccountNameForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-between-groups">
      <CrudForm
        schema={accountUpdateSchema}
        fields={[{ name: "displayName", label: "Display name", autoComplete: "name" }]}
        initialValues={{ displayName }}
        submitLabel="Save name"
        resetOnSuccess={false}
        onSubmit={async (body) => {
          setSaved(false);
          return unlessSessionExpired(await apiCall<AccountDto>("/api/account", { method: "PATCH", body }), "/account");
        }}
        onSuccess={() => {
          setSaved(true);
          router.refresh();
        }}
      />
      {saved ? (
        <Alert role="status" variant="success">
          <AlertTitle>Name saved</AlertTitle>
        </Alert>
      ) : null}
    </div>
  );
}
