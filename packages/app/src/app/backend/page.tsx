import type { Metadata } from "next";
import { connection } from "next/server";

import { User } from "@devmentor/db";
import { Badge } from "@devmentor/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devmentor/ui/components/card";

import { createRequestScope } from "@/server/container";

export const metadata: Metadata = { title: "Dashboard" };

type DatabaseStatus = { ok: true; users: number } | { ok: false; error: string };

async function getDatabaseStatus(): Promise<DatabaseStatus> {
  // Query at request time, never during the build's prerender.
  await connection();
  const { em } = createRequestScope().cradle;
  try {
    return { ok: true, users: await em.count(User) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function BackendDashboard() {
  const db = await getDatabaseStatus();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>PostgreSQL via MikroORM</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Badge variant={db.ok ? "secondary" : "destructive"}>
              {db.ok ? "Connected" : "Unavailable"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {db.ok ? `${db.users} registered users` : db.error}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
