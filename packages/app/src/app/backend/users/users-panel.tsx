"use client";

import { useEffect, useState } from "react";

import { userCreateSchema } from "@devmentor/core/validators/auth/user-create.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import type { ApiResult } from "@devmentor/ui/api/types";
import { CrudForm, type CrudField } from "@devmentor/ui/backend/forms/CrudForm";
import { DataTable, type DataTableColumn } from "@devmentor/ui/backend/tables/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@devmentor/ui/components/card";

import { unlessSessionExpired } from "@/app/session-expiry";
import type { UserDto } from "@/server/services/auth/user.service";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const fields = [
  { name: "name", label: "Name", autoComplete: "off" },
  { name: "email", label: "Email", type: "email", autoComplete: "off" },
] as const satisfies readonly CrudField<"name" | "email">[];

const columns: DataTableColumn<UserDto>[] = [
  { id: "name", header: "Name", cell: (user) => user.name },
  { id: "email", header: "Email", cell: (user) => user.email },
  {
    id: "createdAt",
    header: "Created",
    cell: (user) => dateFormat.format(new Date(user.createdAt)),
    className: "text-muted-foreground",
  },
];

/** Where a 401 sends the operator back to after signing in again (SM-AC2). */
const RETURN_TO = "/backend/users";

type UsersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; users: UserDto[] };

function toUsersState(result: ApiResult<UserDto[]>): UsersState {
  return result.ok
    ? { status: "ready", users: result.data }
    : { status: "error", message: result.error.message };
}

export function UsersPanel() {
  const [state, setState] = useState<UsersState>({ status: "loading" });
  // Bumped to refetch; the effect ignores responses from superseded fetches.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void apiCall<UserDto[]>("/api/users")
      .then((result) => unlessSessionExpired(result, RETURN_TO))
      .then((result) => {
        if (isCurrent) setState(toUsersState(result));
      });
    return () => {
      isCurrent = false;
    };
  }, [version]);

  function reload() {
    setVersion((current) => current + 1);
  }

  function retry() {
    setState({ status: "loading" });
    reload();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-content-aside">
      <DataTable
        columns={columns}
        rows={state.status === "ready" ? state.users : undefined}
        getRowId={(user) => user.id}
        isLoading={state.status === "loading"}
        error={state.status === "error" ? state.message : null}
        onRetry={retry}
        emptyState={{ title: "No users yet", description: "Create the first one with the form." }}
      />
      <Card>
        <CardHeader>
          <CardTitle>New user</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm
            schema={userCreateSchema}
            fields={fields}
            submitLabel="Create user"
            onSubmit={async (values) =>
              unlessSessionExpired(await apiCall<UserDto>("/api/users", { method: "POST", body: values }), RETURN_TO)
            }
            onSuccess={reload}
          />
        </CardContent>
      </Card>
    </div>
  );
}
