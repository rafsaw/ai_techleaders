import type { Metadata } from "next";

import { UsersPanel } from "./users-panel";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <UsersPanel />
    </div>
  );
}
