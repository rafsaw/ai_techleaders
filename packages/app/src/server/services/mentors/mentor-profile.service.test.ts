import { fixedClock, NotFoundError, type Principal } from "@devmentor/core";
import {
  MentorProfile,
  UniqueConstraintViolationException,
  User,
  type EntityManager,
} from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { MENTOR_EXCERPT_MAX_CODE_POINTS, MentorProfileService } from "./mentor-profile.service";

const principal: Principal = { userId: "user-id", sessionId: "session-id", displayName: "Ada", roles: ["mentor"] };
const PROFILE_ID = "3ca6da44-e6c9-41ad-9895-829612fc1a25";
const MISSING_PROFILE_ID = "eb971c25-c2e0-47f0-9341-dd2149d47dc6";
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
    find: vi.fn().mockResolvedValue([]),
    transactional: vi.fn((callback: (transaction: unknown) => unknown) => callback(tx)),
  };
  return { existing, tx, em, service: new MentorProfileService({ em: em as unknown as EntityManager, clock: fixedClock("2026-10-31T00:00:00Z") }) };
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
    await expect(service.getPublic(PROFILE_ID)).resolves.toEqual({ ...dto, displayName: "Ada Lovelace", bookable: false });
    expect(em.findOne).toHaveBeenNthCalledWith(1, MentorProfile, { id: PROFILE_ID }, { populate: ["user"] });
    expect(em.findOne).toHaveBeenNthCalledWith(2, expect.any(Function), { user: "user-id", role: "mentor" });
  });

  it("conceals an absent profile and a profile whose owner is no longer a mentor", async () => {
    const { em, existing, service } = setup();
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.getPublic(MISSING_PROFILE_ID)).rejects.toEqual(new NotFoundError("Mentor profile not found"));
    em.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
    await expect(service.getPublic(PROFILE_ID)).rejects.toEqual(new NotFoundError("Mentor profile not found"));
  });

  it("conceals a malformed public profile id before querying the UUID column", async () => {
    const { em, service } = setup();
    await expect(service.getPublic("not-a-profile-id")).rejects.toEqual(new NotFoundError("Mentor profile not found"));
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it("derives Phase 1 setup state with and without a profile", async () => {
    const { em, existing, service } = setup();
    em.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(service.getSetup(principal)).resolves.toEqual({
      profile: dto,
      payout: { status: "not_started", country: null, provisioningState: null },
      upcomingSlots: { open: 0, booked: 0 },
      bookable: false,
      publicUrl: "/mentors/profile-id",
    });
    await expect(service.getSetup(principal)).resolves.toMatchObject({ profile: null, publicUrl: null, bookable: false });
  });

  it("requires an existing profile before checking bookability", async () => {
    const { em, service } = setup();
    em.findOne.mockResolvedValue(null);
    await expect(service.isBookable("profile-id")).resolves.toBe(false);
  });
});


it("requires mentor, provisioned and ready for bookability", async () => {
  const s = setup();
  s.em.findOne.mockResolvedValueOnce(s.existing).mockResolvedValueOnce(null);
  expect(await s.service.isBookable("profile-id")).toBe(false);
  for (const [provisioningState, status, expected] of [["pending", "ready", false], ["reconciliation_required", "ready", false], ["failed", "ready", false], ["provisioned", "incomplete", false], ["provisioned", "pending", false], ["provisioned", "blocked", false], ["provisioned", "ready", true]] as const) {
    s.em.findOne.mockResolvedValueOnce(s.existing).mockResolvedValueOnce({ role: "mentor" }).mockResolvedValueOnce({ provisioningState, status });
    expect(await s.service.isBookable("profile-id")).toBe(expected);
    s.em.findOne.mockResolvedValueOnce(s.existing).mockResolvedValueOnce({ provisioningState, status, country: "US" });
    expect((await s.service.getSetup(principal)).bookable).toBe(expected);
  }
  s.em.findOne.mockResolvedValueOnce(s.existing).mockResolvedValueOnce({ provisioningState: "provisioned", status: "ready", country: "US" });
  expect((await s.service.getSetup({ ...principal, roles: ["mentee"] })).bookable).toBe(false);
  s.em.findOne.mockResolvedValueOnce(s.existing).mockResolvedValueOnce({ role: "mentor" }).mockResolvedValueOnce(null);
  expect(await s.service.isBookable("profile-id")).toBe(false);
});

it("publishes ready payout bookability on the public profile", async () => {
  const s = setup();
  s.em.findOne.mockResolvedValueOnce(s.existing).mockResolvedValueOnce({ role: "mentor" }).mockResolvedValueOnce({ provisioningState: "provisioned", status: "ready" });
  expect((await s.service.getPublic(PROFILE_ID)).bookable).toBe(true);
});

type ListedProfile = ReturnType<typeof listed>;

function listed({ id, name, area = "typescript" as const, description = "TypeScript systems" }: {
  id: string;
  name: string;
  area?: "typescript" | "react" | "python";
  description?: string;
}) {
  const user = Object.assign(new User(), { id: `user-${id}`, name });
  return Object.assign(new MentorProfile(), {
    id,
    user,
    area,
    description,
    publicWorkLinks: ["https://github.com/ada/project"],
    price25Cents: 4_000,
    price50Cents: 7_000,
  });
}

const mentorRole = (profile: ListedProfile) => ({ user: profile.user, role: "mentor" as const });
const readyPayout = (profile: ListedProfile, provisioningState = "provisioned" as const, status = "ready" as const) =>
  ({ mentorProfile: profile, provisioningState, status });

/** The three `em.find` results `listBookable` reads: profiles, mentor roles, payout accounts. */
function listing(em: ReturnType<typeof setup>["em"], profiles: ListedProfile[], roles: ListedProfile[], payouts: ListedProfile[]) {
  em.find
    .mockReset()
    .mockResolvedValueOnce(profiles)
    .mockResolvedValueOnce(roles.map(mentorRole))
    .mockResolvedValueOnce(payouts.map((profile) => readyPayout(profile)));
}

describe("MentorProfileService.listBookable", () => {
  it("lists only bookable mentors, ordered case-insensitively with the profile id breaking a tie", async () => {
    const s = setup();
    // "ada lovelace" collates equal to "Ada Lovelace", so the smaller profile id wins.
    const lowercaseAda = listed({ id: "id-2", name: "ada lovelace" });
    const ada = listed({ id: "id-1", name: "Ada Lovelace" });
    const grace = listed({ id: "id-3", name: "grace hopper" });
    const withoutRole = listed({ id: "id-4", name: "Alan Turing" });
    const withoutReadyPayout = listed({ id: "id-5", name: "Barbara Liskov" });
    const withoutPayout = listed({ id: "id-6", name: "Carl Sagan" });
    s.em.find
      .mockReset()
      .mockResolvedValueOnce([withoutPayout, lowercaseAda, grace, withoutRole, ada, withoutReadyPayout])
      .mockResolvedValueOnce([lowercaseAda, grace, ada, withoutReadyPayout, withoutPayout].map(mentorRole))
      .mockResolvedValueOnce([
        readyPayout(lowercaseAda),
        readyPayout(grace),
        readyPayout(ada),
        readyPayout(withoutRole),
        { mentorProfile: withoutReadyPayout, provisioningState: "provisioned", status: "incomplete" },
      ]);

    await expect(s.service.listBookable()).resolves.toEqual([
      { id: "id-1", displayName: "Ada Lovelace", area: "typescript", descriptionExcerpt: "TypeScript systems" },
      { id: "id-2", displayName: "ada lovelace", area: "typescript", descriptionExcerpt: "TypeScript systems" },
      { id: "id-3", displayName: "grace hopper", area: "typescript", descriptionExcerpt: "TypeScript systems" },
    ]);
    // Three set-based reads, never one per card, and never a slot query.
    expect(s.em.find).toHaveBeenCalledTimes(3);
    expect(s.em.find).toHaveBeenNthCalledWith(1, MentorProfile, {}, { populate: ["user"] });
    expect(s.em.find).toHaveBeenNthCalledWith(2, expect.any(Function), {
      user: { $in: ["user-id-6", "user-id-2", "user-id-3", "user-id-4", "user-id-1", "user-id-5"] },
      role: "mentor",
    });
    expect(s.em.find).toHaveBeenNthCalledWith(3, expect.any(Function), {
      mentorProfile: { $in: ["id-6", "id-2", "id-3", "id-4", "id-1", "id-5"] },
    });
  });

  it("breaks a display-name tie by profile id whichever order the rows arrive in", async () => {
    const s = setup();
    const ada = listed({ id: "id-1", name: "Ada Lovelace" });
    const lowercaseAda = listed({ id: "id-2", name: "ada lovelace" });
    listing(s.em, [ada, lowercaseAda], [ada, lowercaseAda], [ada, lowercaseAda]);
    await expect(s.service.listBookable()).resolves.toMatchObject([{ id: "id-1" }, { id: "id-2" }]);
  });

  it("filters by exact area and lists a ready mentor that has no slots", async () => {
    const s = setup();
    const grace = listed({ id: "id-1", name: "Grace Hopper", area: "react" });
    listing(s.em, [grace], [grace], [grace]);
    const mentors = await s.service.listBookable("react");
    expect(mentors).toEqual([
      { id: "id-1", displayName: "Grace Hopper", area: "react", descriptionExcerpt: "TypeScript systems" },
    ]);
    // The listing never reads availability, so zero slots cannot remove a ready mentor.
    expect(Object.keys(mentors[0] ?? {})).toEqual(["id", "displayName", "area", "descriptionExcerpt"]);
    expect(s.em.find).toHaveBeenNthCalledWith(1, MentorProfile, { area: "react" }, { populate: ["user"] });
    expect(s.em.find).toHaveBeenCalledTimes(3);
  });

  it("stops after the profile query when no profile matches the area", async () => {
    const s = setup();
    s.em.find.mockReset().mockResolvedValueOnce([]);
    await expect(s.service.listBookable("python")).resolves.toEqual([]);
    expect(s.em.find).toHaveBeenCalledOnce();
  });

  it("normalizes whitespace in the card excerpt", async () => {
    const s = setup();
    const ada = listed({ id: "id-1", name: "Ada", description: "  TypeScript\n\n systems\tand\r\nmore  " });
    listing(s.em, [ada], [ada], [ada]);
    await expect(s.service.listBookable()).resolves.toEqual([
      { id: "id-1", displayName: "Ada", area: "typescript", descriptionExcerpt: "TypeScript systems and more" },
    ]);
  });

  it.each([[159, false], [160, false], [161, true]])(
    "cuts a %i-code-point description and adds an ellipsis only when truncated: %s",
    async (points, truncated) => {
      const s = setup();
      // A non-BMP emoji is one code point but two UTF-16 units, so counting units would truncate early.
      const ada = listed({ id: "id-1", name: "Ada", description: "\u{1F600}".repeat(points) });
      listing(s.em, [ada], [ada], [ada]);
      const descriptionExcerpt = (await s.service.listBookable())[0]?.descriptionExcerpt ?? "";
      expect([...descriptionExcerpt]).toHaveLength(truncated ? MENTOR_EXCERPT_MAX_CODE_POINTS + 1 : points);
      expect(descriptionExcerpt.endsWith("…")).toBe(truncated);
    }
  );

  it("applies the same MD7 rule as the public profile, setup and isBookable", async () => {
    for (const [provisioningState, status, expected] of [
      ["pending", "ready", false],
      ["reconciliation_required", "ready", false],
      ["failed", "ready", false],
      ["provisioned", "incomplete", false],
      ["provisioned", "pending", false],
      ["provisioned", "blocked", false],
      ["provisioned", "ready", true],
    ] as const) {
      const s = setup();
      const ada = listed({ id: "id-1", name: "Ada" });
      s.em.find
        .mockReset()
        .mockResolvedValueOnce([ada])
        .mockResolvedValueOnce([mentorRole(ada)])
        .mockResolvedValueOnce([{ mentorProfile: ada, provisioningState, status }]);
      expect((await s.service.listBookable()).length === 1).toBe(expected);

      // The same payout state, through the public profile and isBookable.
      s.em.findOne.mockResolvedValueOnce(ada).mockResolvedValueOnce(mentorRole(ada)).mockResolvedValueOnce({ provisioningState, status });
      expect((await s.service.getPublic(PROFILE_ID)).bookable).toBe(expected);
      s.em.findOne.mockResolvedValueOnce(ada).mockResolvedValueOnce(mentorRole(ada)).mockResolvedValueOnce({ provisioningState, status });
      expect(await s.service.isBookable(PROFILE_ID)).toBe(expected);
    }
  });
});

it("counts only future open and booked slots in setup", async () => {
  const s = setup();
  s.em.findOne.mockResolvedValueOnce(s.existing).mockResolvedValueOnce(null);
  s.em.find.mockResolvedValueOnce([{ bookedAt: null }, { bookedAt: new Date("2026-10-31T01:00:00Z") }, { bookedAt: null }]);
  expect((await s.service.getSetup(principal)).upcomingSlots).toEqual({ open: 2, booked: 1 });
  expect(s.em.find).toHaveBeenCalledWith(expect.any(Function), { mentorProfile: "profile-id", startsAt: { $gt: new Date("2026-10-31T00:00:00Z") } });
});
