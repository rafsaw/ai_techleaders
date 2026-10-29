import { generateToken, hashToken } from "@devmentor/core";
import { defineEntity, EntitySchema } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { baseProperties } from "./entities/base";
import { singleUseTokenProperties } from "./entities/single-use-token";
import { AuthSession, consumeSingleUseToken, inspectSingleUseToken } from "./index";

// A throwaway entity using the spread, the way email confirmation and invitation tokens will.
const TestTokenSchema = defineEntity({
  name: "TestSingleUseToken",
  tableName: "test_single_use_tokens",
  properties: { ...baseProperties, ...singleUseTokenProperties },
});
class TestToken extends TestTokenSchema.class {}
TestTokenSchema.setClass(TestToken);

const NOW = new Date("2026-10-28T12:00:00.000Z");
const LATER = new Date(NOW.getTime() + 60_000);
const EARLIER = new Date(NOW.getTime() - 60_000);
const TOKEN = generateToken();

type Row = { id: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null };

function row(overrides: Partial<Row> = {}): Row {
  return { id: "t-1", tokenHash: hashToken(TOKEN), expiresAt: LATER, consumedAt: null, ...overrides };
}

/** A mocked em: `findOne` returns `found`, `nativeUpdate` affects `affected` rows, `refresh` returns `reread`. */
function mockEm({ found = row() as Row | null, affected = 1, reread = undefined as Row | null | undefined } = {}) {
  const em = {
    findOne: vi.fn().mockResolvedValue(found),
    nativeUpdate: vi.fn().mockResolvedValue(affected),
    refresh: vi.fn(async (record: Row) =>
      reread !== undefined ? reread : { ...record, consumedAt: affected > 0 ? NOW : record.consumedAt },
    ),
  };
  return { em, typed: em as unknown as EntityManager };
}

describe("singleUseTokenProperties", () => {
  it("adds a unique char(64) token hash, a required expiry and a nullable consumption time", () => {
    const { properties, tableName } = EntitySchema.REGISTRY.get(TestToken)!.meta;
    expect(tableName).toBe("test_single_use_tokens");
    expect(properties.tokenHash).toMatchObject({ unique: true, columnType: "char(64)" });
    // Same datetime type as the session expiry column.
    const datetime = EntitySchema.REGISTRY.get(AuthSession)!.meta.properties.expiresAt!.type;
    expect(properties.expiresAt?.type).toBe(datetime);
    expect(properties.expiresAt?.nullable).toBeFalsy();
    expect(properties.consumedAt?.type).toBe(datetime);
    expect(properties.consumedAt?.nullable).toBe(true);
    expect(properties.id?.primary).toBe(true);
  });
});

describe.each([
  ["inspectSingleUseToken", inspectSingleUseToken],
  ["consumeSingleUseToken", consumeSingleUseToken],
] as const)("%s, shared lookup", (_name, lookup) => {
  it.each(["", "short", `${TOKEN}x`, `${TOKEN.slice(0, 42)}!`])(
    "answers invalid for the malformed token %j without querying",
    async (raw) => {
      const { em, typed } = mockEm();
      await expect(lookup(typed, TestToken, raw, NOW)).resolves.toEqual({ status: "invalid" });
      expect(em.findOne).not.toHaveBeenCalled();
      expect(em.nativeUpdate).not.toHaveBeenCalled();
    },
  );

  it("looks the token up by its hash and answers invalid when no record has it", async () => {
    const { em, typed } = mockEm({ found: null });
    await expect(lookup(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "invalid" });
    expect(em.findOne).toHaveBeenCalledWith(TestToken, { tokenHash: hashToken(TOKEN) });
    expect(JSON.stringify(em.findOne.mock.calls)).not.toContain(TOKEN);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it("answers used for a consumed token, even when it has also expired", async () => {
    for (const expiresAt of [LATER, EARLIER]) {
      const record = row({ consumedAt: EARLIER, expiresAt });
      const { em, typed } = mockEm({ found: record });
      await expect(lookup(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "used", record });
      expect(em.nativeUpdate).not.toHaveBeenCalled();
    }
  });

  it("answers expired for an unused token whose expiry is now or earlier", async () => {
    for (const expiresAt of [NOW, EARLIER]) {
      const record = row({ expiresAt });
      const { em, typed } = mockEm({ found: record });
      await expect(lookup(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "expired", record });
      expect(em.nativeUpdate).not.toHaveBeenCalled();
    }
  });
});

describe("inspectSingleUseToken", () => {
  it("answers valid for an unused token expiring after now, and changes nothing", async () => {
    const record = row({ expiresAt: new Date(NOW.getTime() + 1) });
    const { em, typed } = mockEm({ found: record });
    await expect(inspectSingleUseToken(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "valid", record });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(em.refresh).not.toHaveBeenCalled();
    expect(record.consumedAt).toBeNull();
  });
});

describe("consumeSingleUseToken", () => {
  it("consumes a valid token with a conditional update and returns the reloaded record", async () => {
    const record = row({ expiresAt: new Date(NOW.getTime() + 1) });
    const { em, typed } = mockEm({ found: record, affected: 1 });
    const result = await consumeSingleUseToken(typed, TestToken, TOKEN, NOW);
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      TestToken,
      { id: "t-1", consumedAt: null, expiresAt: { $gt: NOW } },
      { consumedAt: NOW },
    );
    expect(em.refresh).toHaveBeenCalledWith(record);
    expect(result).toEqual({ status: "consumed", record: { ...record, consumedAt: NOW } });
  });

  it("answers used when a concurrent consumer won (0 rows) and the re-read shows it consumed", async () => {
    const reread = row({ consumedAt: NOW });
    const { em, typed } = mockEm({ affected: 0, reread });
    await expect(consumeSingleUseToken(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "used", record: reread });
    expect(em.refresh).toHaveBeenCalledTimes(1);
  });

  it("answers expired when the update hit 0 rows and the re-read shows it lapsed unused", async () => {
    const reread = row({ expiresAt: NOW });
    const { typed } = mockEm({ affected: 0, reread });
    await expect(consumeSingleUseToken(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "expired", record: reread });
  });

  it("answers used, never valid or consumed, when 0 rows were updated but the re-read still looks usable", async () => {
    const reread = row();
    const { typed } = mockEm({ affected: 0, reread });
    await expect(consumeSingleUseToken(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "used", record: reread });
  });

  it.each([0, 1])("answers invalid when the row was deleted meanwhile (%i rows updated)", async (affected) => {
    const { typed } = mockEm({ affected, reread: null });
    await expect(consumeSingleUseToken(typed, TestToken, TOKEN, NOW)).resolves.toEqual({ status: "invalid" });
  });

  it("propagates a database error from the update", async () => {
    const { em, typed } = mockEm();
    em.nativeUpdate.mockRejectedValueOnce(new Error("db down"));
    await expect(consumeSingleUseToken(typed, TestToken, TOKEN, NOW)).rejects.toThrow("db down");
    expect(em.refresh).not.toHaveBeenCalled();
  });
});
