import { NotFoundError, type Principal } from "@devmentor/core";
import {
  MentorProfile,
  UniqueConstraintViolationException,
  User,
  type EntityManager,
} from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { MentorProfileService } from "./mentor-profile.service";

const principal: Principal = { userId: "user-id", sessionId: "session-id", displayName: "Ada", roles: ["mentor"] };
const input = {
  area: "typescript" as const,
  description: "TypeScript systems",
  publicWorkLinks: ["https://github.com/ada/project"],
  price25Dollars: 40,
  price50Dollars: 70,
};

function profile() {
  const user = Object.assign(new User(), { id: "user-id", name: "Ada Lovelace" });
  return Object.assign(new MentorProfile(), {
    id: "profile-id",
    user,
    area: "typescript" as const,
    description: "TypeScript systems",
    publicWorkLinks: ["https://github.com/ada/project"],
    price25Cents: 4_000,
    price50Cents: 7_000,
  });
}

const dto = {
  id: "profile-id",
  area: "typescript",
  description: "TypeScript systems",
  publicWorkLinks: ["https://github.com/ada/project"],
  prices: {
    25: { amountMinor: 4_000, currency: "USD" },
    50: { amountMinor: 7_000, currency: "USD" },
  },
};

function setup() {
  const existing = profile();
  const tx = {
    findOne: vi.fn(),
    create: vi.fn((_entity, data) => Object.assign(existing, data)),
    getReference: vi.fn(() => existing.user),
    persist: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  };
  const em = {
    findOne: vi.fn(),
    transactional: vi.fn((callback: (transaction: unknown) => unknown) => callback(tx)),
  };
  return { existing, tx, em, service: new MentorProfileService({ em: em as unknown as EntityManager }) };
}

describe("MentorProfileService", () => {
  it("returns the caller's profile as a detached DTO, or null", async () => {
    const { em, existing, service } = setup();
    em.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
    const found = await service.getOwn(principal);
    expect(found).toEqual(dto);
    expect(found).not.toBe(existing);
    expect(found?.publicWorkLinks).not.toBe(existing.publicWorkLinks);
    await expect(service.getOwn(principal)).resolves.toBeNull();
    expect(em.findOne).toHaveBeenCalledWith(MentorProfile, { user: "user-id" });
  });

  it("creates a profile with stored cents, then replaces every editable value", async () => {
    const { tx, existing, service } = setup();
    tx.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    await expect(service.save(principal, input)).resolves.toEqual(dto);
    expect(tx.getReference).toHaveBeenCalledWith(User, "user-id");
    expect(tx.create).toHaveBeenCalledWith(MentorProfile, expect.objectContaining({
      user: existing.user,
      price25Cents: 4_000,
      price50Cents: 7_000,
    }));
    expect(tx.persist).toHaveBeenCalledWith(existing);

    await expect(service.save(principal, {
      area: "python",
      description: "Python systems",
      publicWorkLinks: ["https://example.com/talk"],
      price25Dollars: 45,
      price50Dollars: 80,
    })).resolves.toMatchObject({ area: "python", description: "Python systems", prices: {
      25: { amountMinor: 4_500 }, 50: { amountMinor: 8_000 },
    } });
    expect(tx.persist).toHaveBeenCalledOnce();
    expect(tx.flush).toHaveBeenCalledTimes(2);
  });

  it("retries a concurrent first-insert unique conflict as an update", async () => {
    const { em, tx, existing, service } = setup();
    const conflict = new UniqueConstraintViolationException(new Error("mentor_profiles_user_id_unique"));
    em.transactional.mockRejectedValueOnce(conflict).mockImplementationOnce((callback) => callback(tx));
    tx.findOne.mockResolvedValue(existing);
    await expect(service.save(principal, input)).resolves.toEqual(dto);
    expect(em.transactional).toHaveBeenCalledTimes(2);
    expect(em.transactional).toHaveBeenCalledWith(expect.any(Function), { clear: true });
  });

  it("preserves a second unique conflict and unexpected database errors", async () => {
    const { em, service } = setup();
    const conflict = new UniqueConstraintViolationException(new Error("again"));
    em.transactional.mockRejectedValue(conflict);
    await expect(service.save(principal, input)).rejects.toBe(conflict);
    expect(em.transactional).toHaveBeenCalledTimes(2);

    const failure = new Error("disconnected");
    em.transactional.mockReset().mockRejectedValue(failure);
    await expect(service.save(principal, input)).rejects.toBe(failure);
    expect(em.transactional).toHaveBeenCalledOnce();
  });

  it("returns a public profile only while its owner holds mentor", async () => {
    const { em, existing, service } = setup();
    em.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce({ role: "mentor" });
    await expect(service.getPublic("profile-id")).resolves.toEqual({ ...dto, displayName: "Ada Lovelace", bookable: false });
    expect(em.findOne).toHaveBeenNthCalledWith(1, MentorProfile, { id: "profile-id" }, { populate: ["user"] });
    expect(em.findOne).toHaveBeenNthCalledWith(2, expect.any(Function), { user: "user-id", role: "mentor" });
  });

  it("conceals an absent profile and a profile whose owner is no longer a mentor", async () => {
    const { em, existing, service } = setup();
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.getPublic("missing")).rejects.toEqual(new NotFoundError("Mentor profile not found"));
    em.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
    await expect(service.getPublic("profile-id")).rejects.toEqual(new NotFoundError("Mentor profile not found"));
  });

  it("derives Phase 1 setup state with and without a profile", async () => {
    const { em, existing, service } = setup();
    em.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
    await expect(service.getSetup(principal)).resolves.toEqual({
      profile: dto,
      payout: { status: "not_started", country: null, provisioningState: null },
      upcomingSlots: { open: 0, booked: 0 },
      bookable: false,
      publicUrl: "/mentors/profile-id",
    });
    await expect(service.getSetup(principal)).resolves.toMatchObject({ profile: null, publicUrl: null, bookable: false });
  });

  it("keeps bookability false until payout state ships in Phase 2", async () => {
    const { service } = setup();
    await expect(service.isBookable("profile-id")).resolves.toBe(false);
  });
});
