import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { describe, expect, inject, it } from "vitest";
import { useScratchDatabase } from "./scratch-database";

describe("availability migration round trip", () => {
  const db = useScratchDatabase("availability_migration");
  const log = join(inject("integrationArtifactsDirectory"), "availability-migration.log");
  it("applies constraints and reverses the slot table without deleting profiles", async () => {
    await db.migrate("up", ["--to", "Migration20261101041447"], log);
    const user = randomUUID(); const profile = randomUUID();
    await db.query("insert into users (id, created_at, updated_at, email, name) values ($1, now(), now(), 'availability-migration@example.com', 'Mentor')", [user]);
    await db.query("insert into mentor_profiles (id, created_at, updated_at, user_id, area, description, public_work_links, price_25_cents, price_50_cents) values ($1, now(), now(), $2, 'typescript', 'Test', array['https://example.com'], 4000, 7000)", [profile, user]);
    const insert = () => db.query("insert into availability_slots (id, created_at, updated_at, mentor_profile_id, starts_at) values (gen_random_uuid(), now(), now(), $1, '2030-01-01T12:00:00Z')", [profile]);
    await insert(); await expect(insert()).rejects.toMatchObject({ code: "23505" });
    await db.migrate("down", ["--only", "Migration20261101041447"], log);
    expect(await db.query("select to_regclass('public.availability_slots') as table_name")).toEqual([{ table_name: null }]);
    expect(await db.query("select id from mentor_profiles where id = $1", [profile])).toHaveLength(1);
    await db.migrate("up", ["--to", "Migration20261101041447"], log);
    expect(await db.query("select id from availability_slots")).toEqual([]);
  });
});
