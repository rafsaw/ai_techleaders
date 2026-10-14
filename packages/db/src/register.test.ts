import { createAppContainer } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

const doubles = vi.hoisted(() => ({ close: vi.fn(), fork: vi.fn(() => ({})), configurations: [] as unknown[] }));
vi.mock("@mikro-orm/postgresql", () => ({
  MikroORM: class {
    em = { fork: doubles.fork };
    close = doubles.close;
    constructor(config: unknown) { doubles.configurations.push(config); }
  },
  defineConfig: (config: unknown) => config,
}));

import { registerDb } from "./index";

describe("database dependency registration", () => {
  it("lazily shares one ORM, forks EM per scope, and closes on disposal", async () => {
    const container = createAppContainer();
    registerDb(container);
    expect(doubles.configurations).toHaveLength(0);
    const first = container.createScope();
    const second = container.createScope();
    expect(first.cradle.orm).toBe(second.cradle.orm);
    expect(doubles.configurations).toHaveLength(1);
    expect(first.cradle.em).toBe(first.cradle.em);
    expect(first.cradle.em).not.toBe(second.cradle.em);
    expect(doubles.fork).toHaveBeenCalledTimes(2);
    await container.dispose();
    expect(doubles.close).toHaveBeenCalledOnce();
  });
});
