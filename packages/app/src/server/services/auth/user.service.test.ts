import { ConflictError, NotFoundError } from "@devmentor/core";
import { UniqueConstraintViolationException, User, UserRole, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { UserService } from "@/server/services/auth/user.service";

const user = Object.assign(new User(), { id: "user-id", email: "ada@example.com", name: "Ada",
  createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-02T00:00:00Z") });
const dto = { id: "user-id", email: "ada@example.com", name: "Ada", createdAt: "2026-01-01T00:00:00.000Z" };

const menteeRow = { role: "mentee" };

function setup() {
  const flush = vi.fn().mockResolvedValue(undefined);
  const em = { count: vi.fn().mockResolvedValue(3), find: vi.fn().mockResolvedValue([user]),
    create: vi.fn((entity: unknown) => (entity === User ? user : menteeRow)),
    persist: vi.fn().mockReturnValue({ flush }),
    findOne: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) };
  const roleService = { rolesOf: vi.fn().mockResolvedValue(["mentee", "operator"]) };
  return { em, flush, roleService,
    service: new UserService({ em: em as unknown as EntityManager, roleService: roleService as never }) };
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

  it("persists a user with the mentee role in one flush and returns only the public DTO fields", async () => {
    const { em, flush, service } = setup();
    await expect(service.create({ email: "ada@example.com", name: "Ada" })).resolves.toEqual(dto);
    expect(em.create).toHaveBeenCalledWith(User, { email: "ada@example.com", name: "Ada" });
    expect(em.create).toHaveBeenCalledWith(UserRole, { user, role: "mentee" });
    expect(em.persist).toHaveBeenCalledWith([user, menteeRow]);
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

  it("maps an account to a plain AccountDto with live roles and sign-in methods", async () => {
    const { em, roleService, service } = setup();
    em.findOne.mockResolvedValueOnce(user);
    const account = await service.getAccount("user-id");
    expect(account).toEqual({ id: "user-id", email: "ada@example.com", displayName: "Ada",
      roles: ["mentee", "operator"], signInMethods: { github: false, password: false } });
    expect(account).not.toBeInstanceOf(User);
    expect(em.findOne).toHaveBeenCalledWith(User, { id: "user-id" });
    expect(roleService.rolesOf).toHaveBeenCalledWith("user-id");
  });

  it("reports GitHub as a sign-in method once the account is linked", async () => {
    const { em, service } = setup();
    em.findOne.mockResolvedValueOnce(Object.assign(new User(), { ...user, githubId: "583231" }));
    await expect(service.getAccount("user-id")).resolves.toMatchObject({ signInMethods: { github: true, password: false } });
  });

  it("updates the display name and returns the updated account", async () => {
    const { em, service } = setup();
    const editable = Object.assign(new User(), { ...user });
    em.findOne.mockResolvedValueOnce(editable);
    await expect(service.updateDisplayName("user-id", "Ada L.")).resolves.toMatchObject({ displayName: "Ada L." });
    expect(editable.name).toBe("Ada L.");
    expect(em.flush).toHaveBeenCalledOnce();
  });

  it("throws NotFoundError for an unknown account", async () => {
    const { em, service } = setup();
    em.findOne.mockResolvedValue(null);
    await expect(service.getAccount("missing")).rejects.toEqual(new NotFoundError("Account not found"));
    await expect(service.updateDisplayName("missing", "X")).rejects.toBeInstanceOf(NotFoundError);
    expect(em.flush).not.toHaveBeenCalled();
  });
});
