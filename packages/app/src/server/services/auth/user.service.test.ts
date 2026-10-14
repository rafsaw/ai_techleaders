import { ConflictError } from "@devmentor/core";
import { UniqueConstraintViolationException, User, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { UserService } from "@/server/services/auth/user.service";

const user = Object.assign(new User(), { id: "user-id", email: "ada@example.com", name: "Ada",
  createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-02T00:00:00Z") });
const dto = { id: "user-id", email: "ada@example.com", name: "Ada", createdAt: "2026-01-01T00:00:00.000Z" };

function setup() {
  const flush = vi.fn().mockResolvedValue(undefined);
  const em = { count: vi.fn().mockResolvedValue(3), find: vi.fn().mockResolvedValue([user]),
    create: vi.fn().mockReturnValue(user), persist: vi.fn().mockReturnValue({ flush }) };
  return { em, flush, service: new UserService({ em: em as unknown as EntityManager }) };
}

describe("user service", () => {
  it("counts users and lists plain DTOs in newest-first order", async () => {
    const { em, service } = setup();
    await expect(service.count()).resolves.toBe(3);
    expect(em.count).toHaveBeenCalledWith(User);
    const result = await service.list();
    expect(result).toEqual([dto]);
    expect(result[0]).not.toBeInstanceOf(User);
    expect(em.find).toHaveBeenCalledWith(User, {}, { orderBy: { createdAt: "desc" } });
    em.find.mockResolvedValueOnce([]);
    await expect(service.list()).resolves.toEqual([]);
  });

  it("persists a user and returns only the public DTO fields", async () => {
    const { em, flush, service } = setup();
    await expect(service.create({ email: "ada@example.com", name: "Ada" })).resolves.toEqual(dto);
    expect(em.create).toHaveBeenCalledWith(User, { email: "ada@example.com", name: "Ada" });
    expect(em.persist).toHaveBeenCalledWith(user);
    expect(flush).toHaveBeenCalledOnce();
  });

  it("maps unique-index violations to a conflict with its cause", async () => {
    const { flush, service } = setup();
    const cause = new UniqueConstraintViolationException(new Error("unique email"));
    flush.mockRejectedValueOnce(cause);
    await expect(service.create({ email: "ada@example.com", name: "Ada" })).rejects.toEqual(
      new ConflictError("A user with this email already exists", { cause }),
    );
  });

  it("preserves unexpected database failures", async () => {
    const { flush, service } = setup();
    const error = new Error("disconnected");
    flush.mockRejectedValueOnce(error);
    await expect(service.create({ email: "ada@example.com", name: "Ada" })).rejects.toBe(error);
  });
});
