import { Migrator } from "@mikro-orm/migrations";
import { SeedManager } from "@mikro-orm/seeder";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function loadConfig() {
  vi.resetModules();
  return (await import("./config")).default;
}

describe("database configuration", () => {
  it("uses safe pool defaults and committed migrations", async () => {
    vi.stubEnv("DB_POOL_MIN", undefined);
    vi.stubEnv("DB_POOL_MAX", "");
    vi.stubEnv("DB_DEBUG", undefined);
    const config = await loadConfig();
    expect(config.pool).toEqual({ min: 0, max: 10 });
    expect(config.debug).toBe(false);
    expect((config.entities as { name: string }[]).map((entity) => entity.name)).toEqual(["User", "UserRole", "AuthSession", "EmailConfirmationToken", "MentorInvitation", "RateLimitBucket"]);
    expect(config.extensions).toEqual([Migrator, SeedManager]);
    expect(config.migrations).toEqual({ path: "src/migrations", snapshot: false,
      transactional: true, allOrNothing: true });
    // Same module registry as the freshly loaded config (loadConfig resets modules).
    const { DatabaseSeeder } = await import("./seeders/database.seeder");
    expect(config.seeder).toEqual({ seedersList: [DatabaseSeeder], defaultSeeder: "DatabaseSeeder" });
  });

  it("reads explicit connection, pool and debugging settings", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://ci:ci@localhost:5432/isolated");
    vi.stubEnv("DB_POOL_MIN", "2");
    vi.stubEnv("DB_POOL_MAX", "8");
    vi.stubEnv("DB_DEBUG", "true");
    const config = await loadConfig();
    expect(config.clientUrl).toBe("postgresql://ci:ci@localhost:5432/isolated");
    expect(config.pool).toEqual({ min: 2, max: 8 });
    expect(config.debug).toBe(true);
  });

  it.each(["DB_POOL_MIN", "DB_POOL_MAX"])("reports malformed %s", async (name) => {
    vi.stubEnv("DB_POOL_MIN", "0");
    vi.stubEnv("DB_POOL_MAX", "10");
    vi.stubEnv(name, "invalid");
    await expect(loadConfig()).rejects.toThrow(`${name} must be an integer, got "invalid"`);
  });
});
