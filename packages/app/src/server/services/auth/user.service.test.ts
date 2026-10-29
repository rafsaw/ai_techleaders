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

  it("never puts the password hash into a user or account DTO", async () => {
    const { em, service } = setup();
    const withPassword = Object.assign(new User(), { ...user, passwordHash: "$2b$12$".padEnd(60, "x") });
    em.find.mockResolvedValueOnce([withPassword]);
    em.create.mockImplementationOnce(() => withPassword);
    em.findOne.mockResolvedValue(withPassword);
    const results = [...await service.list(), await service.create({ email: "ada@example.com", name: "Ada" }),
      await service.findByEmail("ada@example.com"), await service.getAccount("user-id"),
      await service.updateDisplayName("user-id", "Ada")];
    for (const result of results) {
      expect(result).not.toHaveProperty("passwordHash");
      expect(JSON.stringify(result)).not.toContain("$2b$12$");
    }
  });

  it("reports GitHub as a sign-in method once the account is linked", async () => {
    const { em, service } = setup();
    em.findOne.mockResolvedValueOnce(Object.assign(new User(), { ...user, githubId: "583231" }));
    await expect(service.getAccount("user-id")).resolves.toMatchObject({ signInMethods: { github: true, password: false } });
  });

  it.each([
    ["no password", { passwordHash: null, emailConfirmedAt: new Date() }, false],
    ["an unconfirmed password", { passwordHash: "$2b$12$".padEnd(60, "x"), emailConfirmedAt: null }, false],
    ["a confirmed password", { passwordHash: "$2b$12$".padEnd(60, "x"), emailConfirmedAt: new Date() }, true],
  ])("reports password sign-in only for a usable password (%s)", async (_label, fields, password) => {
    const { em, service } = setup();
    em.findOne.mockResolvedValueOnce(Object.assign(new User(), { ...user, ...fields }));
    await expect(service.getAccount("user-id")).resolves.toMatchObject({ signInMethods: { github: false, password } });
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

  it("finds a user by email as a DTO, or throws NotFoundError", async () => {
    const { em, service } = setup();
    em.findOne.mockResolvedValueOnce(user);
    await expect(service.findByEmail("ada@example.com")).resolves.toEqual(dto);
    expect(em.findOne).toHaveBeenCalledWith(User, { email: "ada@example.com" });
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.findByEmail("x@example.com")).rejects.toThrow(new NotFoundError("No account with the email x@example.com"));
  });
});
