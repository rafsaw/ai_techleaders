import { operatorTitle } from "@/app/backend/operator-title";
import { requireRole } from "@/server/auth/page-guards";

import { UsersPanel } from "./users-panel";

export const generateMetadata = operatorTitle("Users");

export default async function UsersPage() {
  await requireRole("operator", { returnTo: "/backend/users" });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <UsersPanel />
    </div>
  );
}
